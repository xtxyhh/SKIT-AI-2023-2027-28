import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { getAuthenticatedCaller } from "@/lib/auth/admin-auth";
import { ResilientDatabase } from "@/lib/fallback/mockDatabase";

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

    const patientId = caller.patient_id || 1;
    const patient = ResilientDatabase.getPatientById(patientId) || ResilientDatabase.getPatients()[0];

    let extraDetails: any = {};
    try {
      if (patient.notes) {
        extraDetails = JSON.parse(patient.notes);
      }
    } catch {}

    const defaultProfile = {
      patient_id: patient.id,
      protection_status: "ACTIVE",
      journey_stage: "treatment_in_progress",
      treatment_destination: "New Delhi & NCR",
      hospital_name: patient.assigned_hospital || "Medanta - The Medicity",
      estimated_arrival_date: "2026-10-19",
      protection_activated_at: "2026-10-18T10:35:00Z",
      patient: {
        full_name: patient.full_name,
        email: patient.email,
        phone: patient.phone,
        country: patient.country,
        treatment: patient.treatment,
      },
      extra: extraDetails,
    };

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && supabase && caller.auth_mode === "supabase") {
      try {
        const { data: resolvedId } = await supabase.rpc("get_patient_id_from_auth", { auth_user_uuid: caller.id });
        if (resolvedId) {
          const { data: dbProfile } = await supabase.from("patient_safety_profiles").select("*").eq("patient_id", resolvedId).single();
          if (dbProfile) {
            defaultProfile.protection_status = dbProfile.protection_status || "ACTIVE";
            defaultProfile.journey_stage = dbProfile.journey_stage || "treatment_in_progress";
          }
        }
      } catch {}
    }

    return NextResponse.json({
      data: defaultProfile,
      protection_status: defaultProfile.protection_status,
    });
  } catch (error: any) {
    console.error("Error in safety profile:", error);
    const patient = ResilientDatabase.getPatients()[0];
    return NextResponse.json({
      data: {
        patient_id: 1,
        protection_status: "ACTIVE",
        journey_stage: "treatment_in_progress",
        treatment_destination: "New Delhi & NCR",
        hospital_name: patient.assigned_hospital,
        patient: {
          full_name: patient.full_name,
          email: patient.email,
          phone: patient.phone,
          country: patient.country,
          treatment: patient.treatment,
        },
      },
      protection_status: "ACTIVE",
    });
  }
}
