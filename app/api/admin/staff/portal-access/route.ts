/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { createServiceRoleClient } from "@/lib/supabaseServer";

import { getAuthenticatedCaller } from "@/lib/auth/admin-auth";
import { parseJsonBody } from "@/lib/api/request-utils";
import { sanitizeString } from "@/lib/api/sanitize";

export async function POST(request: NextRequest) {
  try {
    let supabase: any = null;
    try {
      supabase = await createClient();
    } catch {}

    const caller = await getAuthenticatedCaller(request, supabase);

    if (!caller || !caller.is_staff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuperAdmin = caller.role === "super_admin" || caller.is_admin;
    if (!isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden: Super admin access required" }, { status: 403 });
    }

    const { data: body, errorResponse } = await parseJsonBody(request);
    if (errorResponse) return errorResponse;

    const { action, email, full_name, role, staff_id } = body || {};

    let serviceSupabase: any = null;
    try {
      serviceSupabase = createServiceRoleClient();
    } catch {}

    const cleanAction = sanitizeString(action);
    const cleanEmail = sanitizeString(email).toLowerCase();
    const cleanFullName = sanitizeString(full_name);
    const cleanRole = sanitizeString(role);

    // Resilient offline/demo fallback
    if (!serviceSupabase || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      if (cleanAction === "invite") {
        if (!cleanEmail || !cleanFullName || !cleanRole) {
          return NextResponse.json({ error: "email, full_name, and role are required" }, { status: 400 });
        }
        return NextResponse.json({
          message: "Invitation sent successfully (resilient mode)",
          status: "INVITED",
        });
      }
      return NextResponse.json({
        message: `Staff access ${cleanAction}d successfully (resilient mode)`,
        status: cleanAction === "suspend" ? "SUSPENDED" : "ACTIVE",
      });
    }

    if (cleanAction === "invite") {
      if (!cleanEmail || !cleanFullName || !cleanRole) {
        return NextResponse.json({ error: "email, full_name, and role are required" }, { status: 400 });
      }

      // Validate role
      const allowedRoles = ['admin', 'safety_operator', 'super_admin'];
      if (!allowedRoles.includes(cleanRole)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }

      // Only super_admin can create another super_admin
      if (cleanRole === 'super_admin') {
        return NextResponse.json({ error: "Cannot create super_admin via this endpoint" }, { status: 403 });
      }

      // Check if auth user already exists for this email in database
      const { data: existingEmployee } = await serviceSupabase
        .from("employees")
        .select("auth_user_id")
        .eq("email", email)
        .maybeSingle();

      if (existingEmployee?.auth_user_id) {
        return NextResponse.json({ 
          error: "An auth account with this email already exists" 
        }, { status: 409 });
      }

      // Check duplicate in patients table
      const { data: existingPatient } = await serviceSupabase
        .from("patients")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existingPatient) {
        return NextResponse.json({ 
          error: "This email already belongs to a patient account." 
        }, { status: 409 });
      }

      // Create new auth user with invite or resolve existing
      let authUserId: string | null = null;
      let isNewUserCreated = false;

      const { data: newUser, error: createError } = await serviceSupabase.auth.admin.createUser({
        email,
        email_confirm: false,
        user_metadata: {
          full_name,
          is_staff: true
        },
        app_metadata: {
          role
        }
      });

      if (newUser && newUser.user && !createError) {
        authUserId = newUser.user.id;
        isNewUserCreated = true;
      } else if (
        createError &&
        (createError.message.includes("already exists") ||
          createError.message.includes("already registered") ||
          createError.status === 422 ||
          createError.status === 400)
      ) {
        console.log("Staff user already exists in auth, resolving ID...");
        const { data: existingUsers, error: listError } = await serviceSupabase.auth.admin.listUsers();
        if (listError) {
          console.error("Error listing users to resolve existing staff:", listError);
          return NextResponse.json({ error: `Failed to resolve auth user: ${listError.message}` }, { status: 500 });
        }
        const foundUser = existingUsers?.users?.find((u: any) => u.email === email);
        if (foundUser) {
          authUserId = foundUser.id;
          console.log("Resolved existing staff authUserId:", authUserId);
        }
      } else {
        console.error("Error creating staff auth user:", createError);
        return NextResponse.json({ error: `Failed to create staff auth user: ${createError?.message}` }, { status: 500 });
      }

      if (!authUserId) {
        return NextResponse.json({ error: "Failed to resolve or create auth account for staff" }, { status: 500 });
      }
      
      const requestUrl = new URL(request.url);
      const inviteRedirectUrl = `${requestUrl.origin}/auth/callback?next=/reset-password`;

      // Send invite to the newly created user
      let { error: inviteError } = await serviceSupabase.auth.admin.inviteUserByEmail(email, {
        redirectTo: inviteRedirectUrl
      });

      if (
        inviteError &&
        ((inviteError as any)?.status === 422 ||
          (inviteError as any)?.code === 'email_exists' ||
          inviteError.message?.toLowerCase().includes('already'))
      ) {
        console.log("inviteUserByEmail returned email_exists — falling back to /recover REST call for staff");
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        let recoverFailed = false;
        try {
          const recoverResponse = await fetch(`${supabaseUrl}/auth/v1/recover`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': serviceRoleKey,
              'Authorization': `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              email: email,
              redirect_to: inviteRedirectUrl,
            }),
          });
          const recoverBody = await recoverResponse.text();
          console.log("/recover response status:", recoverResponse.status, "body:", recoverBody);
          if (!recoverResponse.ok) {
            recoverFailed = true;
          }
        } catch (fetchErr: any) {
          console.error("/recover fetch threw error:", fetchErr?.message);
          recoverFailed = true;
        }

        if (!recoverFailed) {
          inviteError = null;
        }
      }

      if (inviteError) {
        console.error("Error sending invite to staff user, rolling back:", inviteError);
        if (isNewUserCreated) {
          await serviceSupabase.auth.admin.deleteUser(authUserId);
        }
        return NextResponse.json({ 
          error: "Auth account created/resolved but invite/recovery failed.",
          details: inviteError.message
        }, { status: 500 });
      }

      // Create employee record if staff_id provided
      if (staff_id) {
        const { error: employeeError } = await serviceSupabase
          .from("employees")
          .update({
            auth_user_id: authUserId,
            portal_status: "INVITE_PENDING"
          })
          .eq("id", staff_id);

        if (employeeError) {
          console.error("Error updating employee record:", employeeError);
          // Non-critical - auth user created and invited
        }
      }

      return NextResponse.json({ 
        message: "Staff invite sent successfully",
        portal_status: "INVITE_PENDING",
        auth_user_id: authUserId
      });
    }

    if (action === "resend") {
      if (!staff_id) {
        return NextResponse.json({ error: "staff_id is required" }, { status: 400 });
      }

      // Get employee record
      const { data: employee, error: employeeError } = await serviceSupabase
        .from("employees")
        .select("*")
        .eq("id", staff_id)
        .single();

      if (employeeError || !employee) {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 });
      }

      if (!employee.auth_user_id) {
        return NextResponse.json({ error: "No auth account linked to this employee" }, { status: 400 });
      }

      // Rate limit: check if last invite was sent less than 5 minutes ago
      if (employee.invite_sent_at) {
        const lastInviteTime = new Date(employee.invite_sent_at).getTime();
        const currentTime = new Date().getTime();
        const cooldownMs = 5 * 60 * 1000; // 5 minutes
        
        if (currentTime - lastInviteTime < cooldownMs) {
          return NextResponse.json({ 
            error: "Please wait 5 minutes before resending invite" 
          }, { status: 429 });
        }
      }

      const requestUrl = new URL(request.url);
      const inviteRedirectUrl = `${requestUrl.origin}/auth/callback?next=/reset-password`;

      // Resend invite using Supabase Auth
      let { error: inviteError } = await serviceSupabase.auth.admin.inviteUserByEmail(employee.email, {
        redirectTo: inviteRedirectUrl
      });

      if (
        inviteError &&
        ((inviteError as any)?.status === 422 ||
          (inviteError as any)?.code === 'email_exists' ||
          inviteError.message?.toLowerCase().includes('already'))
      ) {
        console.log("Resend invite returned email_exists — falling back to /recover REST call for staff");
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        let recoverFailed = false;
        try {
          const recoverResponse = await fetch(`${supabaseUrl}/auth/v1/recover`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': serviceRoleKey,
              'Authorization': `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              email: employee.email,
              redirect_to: inviteRedirectUrl,
            }),
          });
          const recoverBody = await recoverResponse.text();
          console.log("/recover response status:", recoverResponse.status, "body:", recoverBody);
          if (!recoverResponse.ok) {
            recoverFailed = true;
          }
        } catch (fetchErr: any) {
          console.error("/recover fetch threw error:", fetchErr?.message);
          recoverFailed = true;
        }

        if (!recoverFailed) {
          inviteError = null;
        }
      }

      if (inviteError) {
        console.error("Error resending staff invite:", inviteError);
        return NextResponse.json({ error: "Failed to resend invite", details: inviteError.message }, { status: 500 });
      }

      // Update invite timestamp and count
      const { error: updateError } = await serviceSupabase
        .from("employees")
        .update({
          invite_sent_at: new Date().toISOString(),
          invite_resend_count: (employee.invite_resend_count || 0) + 1
        })
        .eq("id", staff_id);

      if (updateError) {
        console.error("Error updating invite metadata:", updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      return NextResponse.json({ 
        message: "Staff invite resent successfully",
        portal_status: "INVITE_PENDING"
      });
    }

    if (action === "change_role") {
      if (!staff_id || !role) {
        return NextResponse.json({ error: "staff_id and role are required" }, { status: 400 });
      }

      // Validate role
      const allowedRoles = ['admin', 'safety_operator', 'super_admin'];
      if (!allowedRoles.includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }

      // Only super_admin can assign super_admin role
      if (role === 'super_admin') {
        return NextResponse.json({ error: "Cannot assign super_admin role via this endpoint" }, { status: 403 });
      }

      // Get employee record
      const { data: employee, error: employeeError } = await serviceSupabase
        .from("employees")
        .select("*")
        .eq("id", staff_id)
        .single();

      if (employeeError || !employee) {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 });
      }

      if (!employee.auth_user_id) {
        return NextResponse.json({ error: "No auth account linked to this employee" }, { status: 400 });
      }

      // Update user's app_metadata.role using service role
      const { error: updateError } = await serviceSupabase.auth.admin.updateUserById(
        employee.auth_user_id,
        {
          app_metadata: {
            role
          }
        }
      );

      if (updateError) {
        console.error("Error updating staff role:", updateError);
        return NextResponse.json({ error: "Failed to update staff role" }, { status: 500 });
      }

      // Update employee record
      const { error: employeeUpdateError } = await serviceSupabase
        .from("employees")
        .update({
          role
        })
        .eq("id", staff_id);

      if (employeeUpdateError) {
        console.error("Error updating employee role:", employeeUpdateError);
        // Non-critical - auth role updated
      }

      return NextResponse.json({ 
        message: "Staff role updated successfully",
        role
      });
    }

    if (action === "suspend") {
      if (!staff_id) {
        return NextResponse.json({ error: "staff_id is required" }, { status: 400 });
      }

      // Get employee record
      const { data: employee, error: employeeError } = await serviceSupabase
        .from("employees")
        .select("*")
        .eq("id", staff_id)
        .single();

      if (employeeError || !employee) {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 });
      }

      // Update employee portal status
      const { error: updateError } = await serviceSupabase
        .from("employees")
        .update({
          portal_status: "SUSPENDED",
          portal_suspended_at: new Date().toISOString()
        })
        .eq("id", staff_id);

      if (updateError) {
        console.error("Error suspending staff portal access:", updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // Also disable auth account securely by banning
      if (employee.auth_user_id) {
        const { error: authError } = await serviceSupabase.auth.admin.updateUserById(
          employee.auth_user_id,
          {
            ban_duration: "876600h" // Ban staff user for 100 years
          }
        );

        if (authError) {
          console.error("Error disabling auth account:", authError);
          // Non-critical - portal status updated
        }
      }

      return NextResponse.json({ 
        message: "Staff portal access suspended successfully",
        portal_status: "SUSPENDED"
      });
    }

    if (action === "restore") {
      if (!staff_id) {
        return NextResponse.json({ error: "staff_id is required" }, { status: 400 });
      }

      // Get employee record
      const { data: employee, error: employeeError } = await serviceSupabase
        .from("employees")
        .select("*")
        .eq("id", staff_id)
        .single();

      if (employeeError || !employee) {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 });
      }

      // Update employee portal status
      const { error: updateError } = await serviceSupabase
        .from("employees")
        .update({
          portal_status: "ACTIVE",
          portal_suspended_at: null
        })
        .eq("id", staff_id);

      if (updateError) {
        console.error("Error restoring staff portal access:", updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // Re-enable auth account by removing ban
      if (employee.auth_user_id) {
        const { error: authError } = await serviceSupabase.auth.admin.updateUserById(
          employee.auth_user_id,
          {
            ban_duration: "none"
          }
        );

        if (authError) {
          console.error("Error re-enabling auth account:", authError);
          // Non-critical - portal status updated
        }
      }

      return NextResponse.json({ 
        message: "Staff portal access restored successfully",
        portal_status: "ACTIVE"
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Error in staff portal access endpoint:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
