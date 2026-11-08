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
    let cases = ResilientDatabase.getSafetyCases(patientId);

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && supabase && caller.auth_mode === "supabase") {
      try {
        const { data: cloudPatientId } = await supabase.rpc("get_patient_id_from_auth", { auth_user_uuid: caller.id });
        if (cloudPatientId) {
          const { data, error } = await supabase
            .from("safety_cases")
            .select("*")
            .eq("patient_id", cloudPatientId)
            .order("created_at", { ascending: false });

          if (!error && data && data.length > 0) {
            cases = data;
          }
        }
      } catch {}
    }

    return NextResponse.json({ data: cases });
  } catch (error) {
    console.error("Error fetching safety cases:", error);
    return NextResponse.json({ data: ResilientDatabase.getSafetyCases(1) });
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
    const { category, priority, description } = body;

    if (!category || !description) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const patientId = caller.patient_id || 1;

    // 1. Create safety case in resilient database
    const newCase = ResilientDatabase.createSafetyCase({
      patient_id: patientId,
      category: category || "emergency",
      priority: priority || "high",
      description,
    });

    // 2. Try remote Supabase if online
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && supabase && caller.auth_mode === "supabase") {
      try {
        const { data: cloudPatientId } = await supabase.rpc("get_patient_id_from_auth", { auth_user_uuid: caller.id });
        if (cloudPatientId) {
          await supabase.from("safety_cases").insert({
            patient_id: cloudPatientId,
            category,
            priority: priority || "high",
            description,
            status: "open",
          });
        }
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: "Safety case reported successfully",
      data: newCase,
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating safety case:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
