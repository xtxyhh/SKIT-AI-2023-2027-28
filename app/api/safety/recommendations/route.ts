import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { getAuthenticatedCaller } from "@/lib/auth/admin-auth";
import { ResilientDatabase } from "@/lib/fallback/mockDatabase";
import { calculateRecommendation, Recommendation } from "@/lib/safety/protection-recommendations";
import { calculateProtectionStatus } from "@/lib/safety/protection-status";

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

    // Fetch patient safety metrics from resilient database
    const checkIns = ResilientDatabase.getCheckIns(patientId);
    const cases = ResilientDatabase.getSafetyCases(patientId);
    const checklist = ResilientDatabase.getChecklist(patientId);
    const patient = ResilientDatabase.getPatientById(patientId);
    const coordinators = ResilientDatabase.getCoordinators();

    const activeCasesCount = cases.filter(
      (c) => c.status !== "resolved"
    ).length;
    const completedChecklistCount = checklist.filter((c) => c.is_completed).length;
    const totalChecklistCount = checklist.length || 1;
    const checklistCompletionPct = Math.round(
      (completedChecklistCount / totalChecklistCount) * 100
    );
    const incompleteItems = checklist
      .filter((c) => !c.is_completed)
      .map((c) => c.item_type);

    const latestCi = checkIns[0] || null;

    // Protection status calculation
    const statusInfo = calculateProtectionStatus({
      hasSafetyProfile: true,
      journeyStage: patient?.status || "In Transit",
      checklistCompletion: checklistCompletionPct,
      hasVerifiedCoordinator: coordinators.length > 0,
      activeCases: {
        critical: cases.filter((c) => c.priority === "critical" && c.status !== "resolved").length,
        high: cases.filter((c) => c.priority === "high" && c.status !== "resolved").length,
        medium: cases.filter((c) => c.priority === "medium" && c.status !== "resolved").length,
        low: cases.filter((c) => c.priority === "low" && c.status !== "resolved").length,
      },
      latestCheckIn: {
        status: latestCi?.status || null,
        type: (latestCi as any)?.check_in_type || (latestCi as any)?.location || "scheduled",
        createdAt: latestCi?.created_at || null,
      },
      riskLevel: "normal",
    });

    // Calculate primary recommendation
    const recommendation: Recommendation = calculateRecommendation({
      protectionStatus: statusInfo.status,
      checklistCompletion: checklistCompletionPct,
      incompleteChecklistItems: incompleteItems,
      hasVerifiedCoordinator: coordinators.length > 0,
      activeCases: activeCasesCount,
      latestCheckIn: {
        status: latestCi?.status || null,
        createdAt: latestCi?.created_at || null,
      },
      journeyStage: patient?.status || "Hospital Assigned",
    });

    return NextResponse.json({
      success: true,
      patient_id: patientId,
      status: statusInfo,
      recommendation,
      metrics: {
        checklist_completion_percent: checklistCompletionPct,
        incomplete_items_count: incompleteItems.length,
        active_cases_count: activeCasesCount,
        total_check_ins: checkIns.length,
      },
    });
  } catch (error: any) {
    console.error("Error generating safety recommendations:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate safety recommendations" },
      { status: 500 }
    );
  }
}
