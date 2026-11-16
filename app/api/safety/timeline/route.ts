import { NextRequest, NextResponse } from "next/server";
import { createClient, dbCircuitBreaker, safeSupabaseQuery } from "@/lib/supabaseServer";
import { getAuthenticatedCaller } from "@/lib/auth/admin-auth";
import { ResilientDatabase } from "@/lib/fallback/mockDatabase";
import {
  mapCheckInToTimeline,
  mapCaseToTimeline,
  mapChecklistToTimeline,
  mapCoordinatorToTimeline,
  sortTimelineByTimestamp,
  TimelineEvent,
} from "@/lib/safety/protection-timeline";

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

    const { searchParams } = new URL(request.url);
    const requestedPatientId = searchParams.get("patient_id");

    let patientId = caller.patient_id || 1;
    if (caller.is_staff && requestedPatientId) {
      const parsed = parseInt(requestedPatientId, 10);
      if (!isNaN(parsed)) patientId = parsed;
    }

    // 1. Resilient local safety records
    let checkIns = ResilientDatabase.getCheckIns(patientId);
    let cases = ResilientDatabase.getSafetyCases(patientId);
    let checklist = ResilientDatabase.getChecklist(patientId);
    const coordinators = ResilientDatabase.getCoordinators();

    // 2. Query cloud Supabase if online
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !dbCircuitBreaker.isOpen() && supabase) {
      try {
        let cloudPatientId: any = patientId;
        if (caller.auth_mode === "supabase" && !caller.is_staff) {
          const { data } = await supabase.rpc("get_patient_id_from_auth", {
            auth_user_uuid: caller.id,
          });
          if (data) cloudPatientId = data;
        }

        const [checkInsRes, casesRes, checklistRes] = await Promise.allSettled([
          safeSupabaseQuery(
            supabase
              .from("safety_check_ins")
              .select("*")
              .eq("patient_id", cloudPatientId)
              .order("created_at", { ascending: false }),
            checkIns,
            1800
          ),
          safeSupabaseQuery(
            supabase
              .from("safety_cases")
              .select("*")
              .eq("patient_id", cloudPatientId)
              .order("created_at", { ascending: false }),
            cases,
            1800
          ),
          safeSupabaseQuery(
            supabase
              .from("patient_checklist")
              .select("*")
              .eq("patient_id", cloudPatientId)
              .order("created_at", { ascending: false }),
            checklist,
            1800
          ),
        ]);

        if (checkInsRes.status === "fulfilled" && checkInsRes.value.data?.length > 0) {
          checkIns = checkInsRes.value.data;
        }
        if (casesRes.status === "fulfilled" && casesRes.value.data?.length > 0) {
          cases = casesRes.value.data;
        }
        if (checklistRes.status === "fulfilled" && checklistRes.value.data?.length > 0) {
          checklist = checklistRes.value.data;
        }
      } catch {
        dbCircuitBreaker.recordFailure();
      }
    }

    // 3. Assemble unified timeline
    const timelineEvents: TimelineEvent[] = [];

    // Map check-ins
    for (const ci of checkIns) {
      timelineEvents.push(
        mapCheckInToTimeline({
          id: String(ci.id),
          check_in_type: (ci as any).check_in_type || "scheduled",
          status: ci.status,
          notes: (ci as any).notes || null,
          created_at: ci.created_at,
        })
      );
    }

    // Map safety cases
    for (const cs of cases) {
      timelineEvents.push(
        mapCaseToTimeline({
          id: String(cs.id),
          category: cs.category,
          status: cs.status,
          description: cs.description || null,
          created_at: cs.created_at,
        })
      );
    }

    // Map checklist completions
    for (const cl of checklist) {
      timelineEvents.push(
        mapChecklistToTimeline({
          id: String((cl as any).id || cl.item_type),
          item_type: cl.item_type,
          is_completed: cl.is_completed,
          completed_at: cl.completed_at || null,
          created_at: (cl as any).created_at || null,
        })
      );
    }

    // Map coordinator assignment if available
    const assignedCoord = coordinators[0];
    if (assignedCoord) {
      timelineEvents.push(
        mapCoordinatorToTimeline({
          coordinator_id: String(assignedCoord.id),
          full_name: assignedCoord.full_name,
          reference_id: assignedCoord.reference_id,
          phone: assignedCoord.phone,
          is_verified: true,
          is_active: assignedCoord.is_active,
          assigned_at: (assignedCoord as any).assigned_at || (assignedCoord as any).created_at,
        })
      );
    }

    // Sort newest first
    const sorted = sortTimelineByTimestamp(timelineEvents);

    return NextResponse.json({
      success: true,
      patient_id: patientId,
      total_events: sorted.length,
      data: sorted,
    });
  } catch (error: any) {
    console.error("Error generating protection timeline:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate protection timeline" },
      { status: 500 }
    );
  }
}
