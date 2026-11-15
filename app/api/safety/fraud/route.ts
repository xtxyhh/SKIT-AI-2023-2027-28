import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { getAuthenticatedCaller } from "@/lib/auth/admin-auth";
import { ResilientDatabase } from "@/lib/fallback/mockDatabase";
import { parseJsonBody } from "@/lib/api/request-utils";

export async function POST(request: NextRequest) {
  try {
    let supabase: any = null;
    try {
      supabase = await createClient();
    } catch {}

    const caller = await getAuthenticatedCaller(request, supabase);

    if (!caller) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: body, errorResponse } = await parseJsonBody(request);
    if (errorResponse) return errorResponse;

    const report_type = body?.report_type || body?.incident_type || body?.reported_entity_type || "suspicious_billing";
    const { description, contact_method, contact_info } = body || {};

    if (!report_type || !description) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const patientId = caller.patient_id || 1;

    // Record as safety case in resilient database
    const safetyCase = ResilientDatabase.createSafetyCase({
      patient_id: patientId,
      category: "fraud",
      priority: "high",
      description: `[Fraud Report - ${report_type}] ${description} (Contact: ${contact_method || "N/A"}: ${contact_info || "N/A"})`,
    });

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && supabase && caller.auth_mode === "supabase") {
      try {
        const { data: cloudPatientId } = await supabase.rpc("get_patient_id_from_auth", { auth_user_uuid: caller.id });
        if (cloudPatientId) {
          await supabase.from("fraud_reports").insert({
            patient_id: cloudPatientId,
            report_type,
            description: description.trim(),
            contact_method: contact_method || null,
            contact_info: contact_info ? contact_info.trim() : null,
          });
        }
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: "Fraud report submitted. Our safety team is investigating.",
      data: safetyCase,
    }, { status: 201 });
  } catch (error) {
    console.error("Error submitting fraud report:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
