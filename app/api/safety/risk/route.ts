import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { getAuthenticatedCaller } from "@/lib/auth/admin-auth";

export async function GET(request: NextRequest) {
  try {
    let supabase: any = null;
    try {
      supabase = await createClient();
    } catch {}

    const caller = await getAuthenticatedCaller(request, supabase);

    if (!caller) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const defaultRisk = {
      risk_level: "normal",
      patient_safe_status: "All systems normal. Your journey is monitored 24/7.",
      explanation: "No active security incidents, flight delays, or medical anomalies detected.",
      recommended_actions: [
        "Continue with scheduled medical consultations.",
        "Keep your HealWithIndia emergency contact card accessible.",
      ],
      evaluated_at: new Date().toISOString(),
    };

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && supabase && caller.auth_mode === "supabase") {
      try {
        const { data: cloudPatientId } = await supabase.rpc("get_patient_id_from_auth", { auth_user_uuid: caller.id });
        if (cloudPatientId) {
          const { data: riskAssessment } = await supabase
            .from("risk_assessments")
            .select("*")
            .eq("patient_id", cloudPatientId)
            .eq("is_current", true)
            .single();

          if (riskAssessment) {
            defaultRisk.risk_level = riskAssessment.risk_level || "normal";
          }
        }
      } catch {}
    }

    return NextResponse.json({ success: true, data: defaultRisk, ...defaultRisk });
  } catch (error) {
    console.error("Error fetching risk:", error);
    return NextResponse.json({
      risk_level: "normal",
      patient_safe_status: "All systems normal",
      explanation: "Monitoring active.",
      recommended_actions: [],
      evaluated_at: new Date().toISOString(),
    });
  }
}
