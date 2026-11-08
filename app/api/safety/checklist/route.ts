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
    let items = ResilientDatabase.getChecklist(patientId);

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && supabase && caller.auth_mode === "supabase") {
      try {
        const { data: cloudPatientId } = await supabase.rpc("get_patient_id_from_auth", { auth_user_uuid: caller.id });
        if (cloudPatientId) {
          const { data, error } = await supabase
            .from("journey_safety_checklist")
            .select("*")
            .eq("patient_id", cloudPatientId);

          if (!error && data && data.length > 0) {
            items = data;
          }
        }
      } catch {}
    }

    return NextResponse.json({ data: items });
  } catch (error) {
    console.error("Error fetching checklist:", error);
    return NextResponse.json({ data: ResilientDatabase.getChecklist(1) });
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
    const item_type = body.item_type || body.item_id;
    const { is_completed, notes } = body;

    if (!item_type) {
      return NextResponse.json({ error: "Missing item_type" }, { status: 400 });
    }

    const patientId = caller.patient_id || 1;

    // 1. Toggle in resilient database
    const updatedItems = ResilientDatabase.toggleChecklist(patientId, item_type, !!is_completed);

    // 2. Try remote Supabase if online
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && supabase && caller.auth_mode === "supabase") {
      try {
        const { data: cloudPatientId } = await supabase.rpc("get_patient_id_from_auth", { auth_user_uuid: caller.id });
        if (cloudPatientId) {
          await supabase
            .from("journey_safety_checklist")
            .upsert({
              patient_id: cloudPatientId,
              item_type,
              is_completed: !!is_completed,
              completed_at: is_completed ? new Date().toISOString() : null,
              notes,
            }, { onConflict: "patient_id,item_type" });
        }
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: "Checklist updated successfully",
      data: updatedItems,
    });
  } catch (error: any) {
    console.error("Error updating checklist:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
