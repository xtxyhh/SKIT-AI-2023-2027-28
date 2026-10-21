import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { PatientAssignmentService } from "@/lib/services/patientAssignmentService";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Resolve patient_id via get_patient_id_from_auth RPC
    const { data: patientId, error: rpcError } = await supabase
      .rpc("get_patient_id_from_auth", { auth_user_uuid: user.id });

    if (rpcError || !patientId) {
      // Provision fallback patient record if user exists in auth but not mapped
      const { data: newPatient, error: createError } = await supabase
        .from("patients")
        .insert({
          full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Patient",
          email: user.email,
          country: user.user_metadata?.country || "International",
          status: "Inquiry",
        })
        .select()
        .single();

      if (createError || !newPatient) {
        return NextResponse.json({ error: "Patient record missing" }, { status: 404 });
      }

      await supabase.from("patient_auth_mapping").insert({
        auth_user_id: user.id,
        patient_id: newPatient.id,
      });

      return NextResponse.json({
        patient: newPatient,
        coordinator: null,
        journey_stages: [],
        travel: null,
        visa: null,
        invoices: [],
        medical_reports: [],
        safety_status: { status: "Active", risk_level: "normal" }
      });
    }

    // Fetch patient CRM details
    const { data: patient } = await supabase
      .from("patients")
      .select("*")
      .eq("id", patientId)
      .single();

    // Fetch coordinator assignment
    const { data: coordinator } = await supabase
      .rpc("get_coordinator_verification_by_auth", { auth_user_uuid: user.id });

    // Fetch 17 journey stages
    const { data: journeyStages } = await supabase
      .from("patient_journey_stages")
      .select("*")
      .eq("patient_id", patientId)
      .order("updated_at", { ascending: true });

    // Fetch travel details
    const { data: travel } = await supabase
      .from("travel_details")
      .select("*")
      .eq("patient_id", patientId)
      .single();

    // Fetch visa details
    const { data: visa } = await supabase
      .from("visa_details")
      .select("*")
      .eq("patient_id", patientId)
      .single();

    // Fetch invoices
    const { data: invoices } = await supabase
      .from("invoices")
      .select("*, payments(*)")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    // Fetch medical reports
    const { data: medicalReports } = await supabase
      .from("medical_reports")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    // Fetch safety risk assessment
    const { data: risk } = await supabase
      .from("risk_assessments")
      .select("*")
      .eq("patient_id", patientId)
      .order("evaluated_at", { ascending: false })
      .limit(1)
      .single();

    // Fetch relational patient assignments (doctors, care team, treatments, hospital bed)
    let assignments = null;
    try {
      assignments = await PatientAssignmentService.getCompletePatientAssignments(supabase, patientId);
    } catch (assignErr) {
      console.warn("Assignments table not yet populated or accessible:", assignErr);
    }

    return NextResponse.json({
      patient,
      coordinator: coordinator?.[0] || null,
      journey_stages: journeyStages || [],
      travel: travel || null,
      visa: visa || null,
      invoices: invoices || [],
      medical_reports: medicalReports || [],
      assignments: assignments || {
        doctors: [],
        care_team: [],
        treatments: [],
        hospital_stay: null,
        escort: null,
        active_lead_doctor: null,
      },
      safety_status: {
        status: "Protection Active",
        risk_level: risk?.overall_risk || "normal",
        last_evaluated: risk?.evaluated_at || new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error fetching patient dashboard:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
