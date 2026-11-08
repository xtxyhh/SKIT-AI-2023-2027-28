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
    let checkIns = ResilientDatabase.getCheckIns(patientId);

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && supabase && caller.auth_mode === "supabase") {
      try {
        const { data: cloudPatientId } = await supabase.rpc("get_patient_id_from_auth", { auth_user_uuid: caller.id });
        if (cloudPatientId) {
          const { data, error } = await supabase
            .from("safety_check_ins")
            .select("*")
            .eq("patient_id", cloudPatientId)
            .order("created_at", { ascending: false });

          if (!error && data && data.length > 0) {
            checkIns = data;
          }
        }
      } catch {}
    }

    return NextResponse.json({ data: checkIns });
  } catch (error) {
    console.error("Error fetching check-ins:", error);
    return NextResponse.json({ data: ResilientDatabase.getCheckIns(1) });
  }
}

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

    const body = await request.json();
    const { status, notes, location } = body;

    const patientId = caller.patient_id || 1;
    const checkInStatus = status === "assistance_requested" ? "assistance_requested" : "safe";

    // 1. Record check-in in resilient database
    const newCheckIn = ResilientDatabase.addCheckIn(patientId, checkInStatus, location, notes);

    // If assistance requested, also open an urgent safety case
    if (checkInStatus === "assistance_requested") {
      ResilientDatabase.createSafetyCase({
        patient_id: patientId,
        category: "emergency",
        priority: "high",
        description: notes || "Assistance requested via Tourist Safety Check-in beacon.",
      });
    }

    // 2. Try remote Supabase if online
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && supabase && caller.auth_mode === "supabase") {
      try {
        const { data: cloudPatientId } = await supabase.rpc("get_patient_id_from_auth", { auth_user_uuid: caller.id });
        if (cloudPatientId) {
          await supabase.from("safety_check_ins").insert({
            patient_id: cloudPatientId,
            check_in_type: "scheduled",
            status: checkInStatus,
            notes,
            location_verified: true,
          });
        }
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: "Check-in recorded successfully",
      data: newCheckIn,
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating check-in:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
