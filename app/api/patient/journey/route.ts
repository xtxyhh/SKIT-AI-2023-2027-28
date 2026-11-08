import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { getAuthenticatedCaller } from "@/lib/auth/admin-auth";

const ALL_STAGES = [
  "Inquiry", "Lead", "Review", "Coordinator Assigned", "Medical Reports",
  "Hospital", "Doctor", "Treatment Plan", "Quote", "Invoice",
  "Payment", "Visa", "Travel", "Arrival", "Treatment",
  "Recovery", "Follow-up", "Completed"
];

const DEFAULT_STAGES = [
  { stage: "Inquiry", status: "completed", updated_at: "2026-10-18T10:30:00Z" },
  { stage: "Coordinator Assigned", status: "completed", updated_at: "2026-10-18T10:35:00Z" },
  { stage: "Hospital", status: "completed", updated_at: "2026-10-18T11:00:00Z" },
  { stage: "Doctor", status: "completed", updated_at: "2026-10-18T11:30:00Z" },
  { stage: "Quote", status: "completed", updated_at: "2026-10-18T12:00:00Z" },
  { stage: "Payment", status: "completed", updated_at: "2026-10-19T14:00:00Z" },
  { stage: "Visa", status: "completed", updated_at: "2026-10-19T16:00:00Z" },
  { stage: "Travel", status: "completed", updated_at: "2026-10-19T18:00:00Z" },
  { stage: "Arrival", status: "completed", updated_at: "2026-10-20T10:00:00Z" },
  { stage: "Treatment", status: "in_progress", updated_at: "2026-10-22T08:00:00Z" },
];

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

    let stages = DEFAULT_STAGES;

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && supabase && caller.auth_mode === "supabase") {
      try {
        const { data: patientId } = await supabase.rpc("get_patient_id_from_auth", { auth_user_uuid: caller.id });
        if (patientId) {
          const { data: dbStages } = await supabase
            .from("patient_journey_stages")
            .select("*")
            .eq("patient_id", patientId)
            .order("updated_at", { ascending: true });

          if (dbStages && dbStages.length > 0) {
            stages = dbStages;
          }
        }
      } catch {}
    }

    return NextResponse.json({ success: true, data: stages, stages, all_stages: ALL_STAGES });
  } catch (error) {
    console.error("Error fetching journey:", error);
    return NextResponse.json({ stages: DEFAULT_STAGES, all_stages: ALL_STAGES });
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
    const { stage, status, notes } = body;

    if (!stage) {
      return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
    }

    const updated = {
      stage,
      status: status || "in_progress",
      notes: notes || "",
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating journey:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
