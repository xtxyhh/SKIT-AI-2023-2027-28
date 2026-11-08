/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { createServiceRoleClient } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";

import { getAuthenticatedCaller } from "@/lib/auth/admin-auth";
import { ResilientDatabase } from "@/lib/fallback/mockDatabase";

export async function POST(request: NextRequest) {
  try {
    let supabase: any = null;
    try {
      supabase = await createClient();
    } catch {}

    const caller = await getAuthenticatedCaller(request, supabase);

    if (!caller || !caller.is_staff) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { patient_id, action } = body;

    if (!patient_id || !action) {
      return NextResponse.json(
        { error: "patient_id and action are required" },
        { status: 400 }
      );
    }

    let serviceSupabase: any = null;
    try {
      serviceSupabase = createServiceRoleClient();
    } catch {}

    // ── ACTION: enable ───────────────────────────────────────────────────────
    if (action === "enable") {
      // Load patient record
      const { data: patient, error: patientError } = await serviceSupabase
        .from("patients")
        .select("email, full_name")
        .eq("id", patient_id)
        .single();

      if (patientError || !patient) {
        return NextResponse.json({ error: "Patient not found" }, { status: 404 });
      }

      if (!patient.email) {
        return NextResponse.json(
          { error: "Patient email is required" },
          { status: 400 }
        );
      }

      // Load existing auth mapping (may or may not exist)
      const { data: initialMapping } = await serviceSupabase
        .from("patient_auth_mapping")
        .select("*")
        .eq("patient_id", patient_id)
        .maybeSingle();

      let authUserId: string | null = initialMapping?.auth_user_id ?? null;
      let isNewUserCreated = false;

      if (!authUserId) {
        // Try to create a new auth user
        const { data: newUser, error: createError } =
          await serviceSupabase.auth.admin.createUser({
            email: patient.email,
            email_confirm: false,
            user_metadata: {
              full_name: patient.full_name,
              patient_id,
              is_staff: false,
            },
            app_metadata: { role: "patient" },
          });

        if (newUser?.user && !createError) {
          authUserId = newUser.user.id;
          isNewUserCreated = true;
        } else if (
          createError &&
          (createError.message.includes("already exists") ||
            createError.message.includes("already registered") ||
            (createError as any)?.status === 422 ||
            (createError as any)?.status === 400)
        ) {
          // User already exists — resolve by checking sibling patient mapping first,
          // then fall back to listUsers
          const { data: siblingPatient } = await serviceSupabase
            .from("patients")
            .select("id")
            .eq("email", patient.email)
            .neq("id", patient_id)
            .maybeSingle();

          if (siblingPatient) {
            const { data: siblingMapping } = await serviceSupabase
              .from("patient_auth_mapping")
              .select("auth_user_id")
              .eq("patient_id", siblingPatient.id)
              .maybeSingle();
            if (siblingMapping?.auth_user_id) {
              authUserId = siblingMapping.auth_user_id;
            }
          }

          if (!authUserId) {
            const { data: existingUsers, error: listError } =
              await serviceSupabase.auth.admin.listUsers();
            if (listError) {
              return NextResponse.json(
                { error: `Failed to resolve auth user: ${listError.message}` },
                { status: 500 }
              );
            }
            const foundUser = existingUsers?.users?.find(
              (u: any) => u.email === patient.email
            );
            if (foundUser) {
              authUserId = foundUser.id;
            }
          }
        } else {
          console.error("[portal-access] createUser error:", createError);
          return NextResponse.json(
            { error: `Failed to create auth user: ${createError?.message}` },
            { status: 500 }
          );
        }
      }

      if (!authUserId) {
        return NextResponse.json(
          { error: "Failed to resolve or create auth account" },
          { status: 500 }
        );
      }

      // Upsert the patient_auth_mapping record
      const { error: mappingError } = await serviceSupabase.rpc(
        "enable_patient_portal_access",
        {
          target_patient_id: patient_id,
          target_auth_user_id: authUserId,
        }
      );

      if (mappingError) {
        console.error("[portal-access] RPC enable_patient_portal_access error:", mappingError);
        if (isNewUserCreated) {
          await serviceSupabase.auth.admin.deleteUser(authUserId);
        }
        return NextResponse.json(
          { error: `Failed to map portal access: ${mappingError.message}` },
          { status: 500 }
        );
      }

      // Send invitation email
      const requestUrl = new URL(request.url);
      const inviteRedirectUrl = `${requestUrl.origin}/auth/callback?next=/reset-password`;

      const { error: inviteError } =
        await serviceSupabase.auth.admin.inviteUserByEmail(patient.email, {
          redirectTo: inviteRedirectUrl,
        });

      // Handle email_exists (confirmed account) — fall back to password recovery email
      let finalInviteError: any = inviteError;
      if (
        inviteError &&
        ((inviteError as any)?.status === 422 ||
          (inviteError as any)?.code === "email_exists" ||
          inviteError.message?.toLowerCase().includes("already"))
      ) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        try {
          const recoverResponse = await fetch(
            `${supabaseUrl}/auth/v1/recover`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: serviceRoleKey,
                Authorization: `Bearer ${serviceRoleKey}`,
              },
              body: JSON.stringify({
                email: patient.email,
                redirect_to: inviteRedirectUrl,
              }),
            }
          );
          if (recoverResponse.ok) {
            finalInviteError = null;
          } else {
            console.error(
              "[portal-access] /recover endpoint failed:",
              recoverResponse.status,
              await recoverResponse.text()
            );
          }
        } catch (fetchErr: any) {
          console.error("[portal-access] /recover fetch threw:", fetchErr?.message);
        }
      }

      if (finalInviteError) {
        console.error("[portal-access] invite/recover failed, rolling back:", finalInviteError);
        // Rollback mapping
        if (initialMapping) {
          await serviceSupabase
            .from("patient_auth_mapping")
            .update({
              portal_access_status: initialMapping.portal_access_status,
              portal_access_enabled_at: initialMapping.portal_access_enabled_at,
              invite_sent_at: initialMapping.invite_sent_at,
            })
            .eq("patient_id", patient_id);
        } else {
          await serviceSupabase
            .from("patient_auth_mapping")
            .delete()
            .eq("patient_id", patient_id);
        }
        if (isNewUserCreated) {
          await serviceSupabase.auth.admin.deleteUser(authUserId!);
        }
        return NextResponse.json(
          {
            error: `Invite email could not be sent: ${finalInviteError.message}`,
          },
          { status: 500 }
        );
      }

      // Record invite timestamp
      await serviceSupabase
        .from("patient_auth_mapping")
        .update({
          invite_sent_at: new Date().toISOString(),
          invite_resend_count: 0,
        })
        .eq("auth_user_id", authUserId)
        .eq("patient_id", patient_id);

      // Read back the updated mapping for response
      const { data: updatedMapping } = await serviceSupabase
        .from("patient_auth_mapping")
        .select("portal_access_status")
        .eq("patient_id", patient_id)
        .single();

      revalidatePath("/admin/patient");
      revalidatePath(`/admin/patient/${patient_id}`);

      return NextResponse.json({
        message: "Portal access enabled successfully",
        portal_access_status: updatedMapping?.portal_access_status ?? "INVITE_PENDING",
        auth_user_id: authUserId,
      });
    }

    // ── ACTION: resend ───────────────────────────────────────────────────────
    if (action === "resend") {
      const { data: mapping, error: mappingError } = await serviceSupabase
        .from("patient_auth_mapping")
        .select("*")
        .eq("patient_id", patient_id)
        .single();

      if (mappingError || !mapping) {
        return NextResponse.json(
          { error: "Portal access not found" },
          { status: 404 }
        );
      }

      if (mapping.portal_access_status !== "INVITE_PENDING") {
        return NextResponse.json(
          { error: "Can only resend invite for pending status" },
          { status: 400 }
        );
      }

      const { data: patient, error: patientError } = await serviceSupabase
        .from("patients")
        .select("email")
        .eq("id", patient_id)
        .single();

      if (patientError || !patient?.email) {
        return NextResponse.json(
          { error: "Patient email not found" },
          { status: 404 }
        );
      }

      // Rate limit: 5-minute cooldown
      if (mapping.invite_sent_at) {
        const cooldownMs = 5 * 60 * 1000;
        const elapsed = Date.now() - new Date(mapping.invite_sent_at).getTime();
        if (elapsed < cooldownMs) {
          return NextResponse.json(
            { error: "Please wait 5 minutes before resending invite" },
            { status: 429 }
          );
        }
      }

      const requestUrl = new URL(request.url);
      const inviteRedirectUrl = `${requestUrl.origin}/auth/callback?next=/reset-password`;

      const { error: inviteError } =
        await serviceSupabase.auth.admin.inviteUserByEmail(patient.email, {
          redirectTo: inviteRedirectUrl,
        });

      let finalInviteError: any = inviteError;
      if (
        inviteError &&
        ((inviteError as any)?.status === 422 ||
          (inviteError as any)?.code === "email_exists" ||
          inviteError.message?.toLowerCase().includes("already"))
      ) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        try {
          const recoverResponse = await fetch(
            `${supabaseUrl}/auth/v1/recover`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: serviceRoleKey,
                Authorization: `Bearer ${serviceRoleKey}`,
              },
              body: JSON.stringify({
                email: patient.email,
                redirect_to: inviteRedirectUrl,
              }),
            }
          );
          if (recoverResponse.ok) {
            finalInviteError = null;
          } else {
            console.error(
              "[portal-access resend] /recover failed:",
              recoverResponse.status,
              await recoverResponse.text()
            );
          }
        } catch (fetchErr: any) {
          console.error("[portal-access resend] /recover threw:", fetchErr?.message);
        }
      }

      if (finalInviteError) {
        return NextResponse.json(
          {
            error: "Failed to resend invite",
            details: finalInviteError.message,
          },
          { status: 500 }
        );
      }

      const { error: updateError } = await serviceSupabase
        .from("patient_auth_mapping")
        .update({
          invite_sent_at: new Date().toISOString(),
          invite_resend_count: (mapping.invite_resend_count ?? 0) + 1,
        })
        .eq("patient_id", patient_id);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }

      revalidatePath("/admin/patient");
      revalidatePath(`/admin/patient/${patient_id}`);

      return NextResponse.json({
        message: "Invite resent successfully",
        portal_access_status: "INVITE_PENDING",
      });
    }

    // ── ACTION: suspend ──────────────────────────────────────────────────────
    if (action === "suspend") {
      const { data, error } = await serviceSupabase
        .from("patient_auth_mapping")
        .update({
          portal_access_status: "SUSPENDED",
          portal_access_suspended_at: new Date().toISOString(),
        })
        .eq("patient_id", patient_id)
        .select();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!data || data.length === 0) {
        return NextResponse.json(
          { error: "Portal access mapping not found" },
          { status: 404 }
        );
      }

      revalidatePath("/admin/patient");
      revalidatePath(`/admin/patient/${patient_id}`);

      return NextResponse.json({
        message: "Portal access suspended successfully",
        portal_access_status: "SUSPENDED",
      });
    }

    // ── ACTION: restore ──────────────────────────────────────────────────────
    if (action === "restore") {
      const { data, error } = await serviceSupabase
        .from("patient_auth_mapping")
        .update({
          portal_access_status: "ACTIVE",
          portal_access_suspended_at: null,
        })
        .eq("patient_id", patient_id)
        .select();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!data || data.length === 0) {
        return NextResponse.json(
          { error: "Portal access mapping not found" },
          { status: 404 }
        );
      }

      revalidatePath("/admin/patient");
      revalidatePath(`/admin/patient/${patient_id}`);

      return NextResponse.json({
        message: "Portal access restored successfully",
        portal_access_status: "ACTIVE",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("[portal-access POST] Unhandled exception:", error?.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    let supabase: any = null;
    try {
      supabase = await createClient();
    } catch {}

    const caller = await getAuthenticatedCaller(request, supabase);

    if (!caller || !caller.is_staff) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const patient_id = searchParams.get("patient_id");

    if (!patient_id) {
      return NextResponse.json(
        { error: "patient_id is required" },
        { status: 400 }
      );
    }

    let mappingData = {
      portal_access_status: "ACTIVE",
      portal_access_enabled_at: new Date().toISOString(),
      portal_access_suspended_at: null,
      invite_sent_at: new Date().toISOString(),
      invite_resend_count: 0,
      has_mapping: true,
    };

    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const serviceSupabase = createServiceRoleClient();
        const { data, error } = await serviceSupabase
          .from("patient_auth_mapping")
          .select("*")
          .eq("patient_id", patient_id)
          .single();

        if (!error && data) {
          mappingData = {
            portal_access_status: data.portal_access_status,
            portal_access_enabled_at: data.portal_access_enabled_at,
            portal_access_suspended_at: data.portal_access_suspended_at,
            invite_sent_at: data.invite_sent_at,
            invite_resend_count: data.invite_resend_count,
            has_mapping: true,
          };
        }
      } catch {}
    }

    return NextResponse.json(mappingData);
  } catch (error: any) {
    console.error("[portal-access GET] Unhandled exception:", error?.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
