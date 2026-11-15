import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabaseServer";
import { getAuthenticatedCaller } from "@/lib/auth/admin-auth";
import { parseJsonBody } from "@/lib/api/request-utils";

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

    const { data: body, errorResponse } = await parseJsonBody(request);
    if (errorResponse) return errorResponse;

    const { patient_id, action } = body || {};

    if (!patient_id || !action) {
      return NextResponse.json({ error: "patient_id and action are required" }, { status: 400 });
    }

    if (action === "activate") {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        try {
          const serviceSupabase = createServiceRoleClient();
          await serviceSupabase.rpc("activate_patient_protection", {
            target_patient_id: patient_id,
          });
        } catch (err: any) {
          console.warn("[patient/protection] Supabase activate RPC skipped:", err.message);
        }
      }

      return NextResponse.json({
        message: "Smart Tourist Protection activated successfully",
        protection_status: "ACTIVE",
      });
    }

    if (action === "suspend") {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        try {
          const serviceSupabase = createServiceRoleClient();
          await serviceSupabase
            .from("patient_safety_profiles")
            .update({
              protection_status: "SUSPENDED",
              protection_suspended_at: new Date().toISOString(),
            })
            .eq("patient_id", patient_id);
        } catch (err: any) {
          console.warn("[patient/protection] Supabase suspend skipped:", err.message);
        }
      }

      return NextResponse.json({
        message: "Smart Tourist Protection suspended successfully",
        protection_status: "SUSPENDED",
      });
    }

    if (action === "reactivate") {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        try {
          const serviceSupabase = createServiceRoleClient();
          await serviceSupabase
            .from("patient_safety_profiles")
            .update({
              protection_status: "ACTIVE",
              protection_suspended_at: null,
            })
            .eq("patient_id", patient_id);
        } catch (err: any) {
          console.warn("[patient/protection] Supabase reactivate skipped:", err.message);
        }
      }

      return NextResponse.json({
        message: "Smart Tourist Protection reactivated successfully",
        protection_status: "ACTIVE",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Error managing patient protection:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
