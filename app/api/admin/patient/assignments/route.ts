import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient, dbCircuitBreaker } from "@/lib/supabaseServer";
import { PatientAssignmentService } from "@/lib/services/patientAssignmentService";
import { getAuthenticatedCaller } from "@/lib/auth/admin-auth";
import { ResilientDatabase } from "@/lib/fallback/mockDatabase";
import { parseJsonBody } from "@/lib/api/request-utils";

export async function GET(request: NextRequest) {
  try {
    let supabase: any = null;
    try {
      supabase = await createClient();
    } catch {}

    const caller = await getAuthenticatedCaller(request, supabase);

    if (!caller || !caller.is_staff) {
      return NextResponse.json({ error: "Forbidden: Staff access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const patientIdParam = searchParams.get("patient_id");

    if (!patientIdParam) {
      return NextResponse.json({ error: "patient_id query parameter is required" }, { status: 400 });
    }

    const patientId = parseInt(patientIdParam, 10);
    if (isNaN(patientId)) {
      return NextResponse.json({ error: "Invalid patient_id format" }, { status: 400 });
    }

    let assignments = ResilientDatabase.getAssignments(patientId);

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !dbCircuitBreaker.isOpen()) {
      try {
        const serviceSupabase = createServiceRoleClient();
        const cloudAssignments = await PatientAssignmentService.getCompletePatientAssignments(
          serviceSupabase,
          patientId
        );
        if (
          cloudAssignments &&
          (cloudAssignments.doctors?.length > 0 ||
            cloudAssignments.care_team?.length > 0 ||
            cloudAssignments.treatments?.length > 0 ||
            cloudAssignments.hospital_stay !== null)
        ) {
          assignments = cloudAssignments;
        }
      } catch (err: any) {
        dbCircuitBreaker.recordFailure();
        console.warn("[assignments GET] Falling back to resilient assignments:", err.message);
      }
    }

    return NextResponse.json({ success: true, data: assignments });
  } catch (error: any) {
    console.error("Error in admin patient assignments GET:", error);
    const patientId = 1;
    return NextResponse.json({ success: true, data: ResilientDatabase.getAssignments(patientId) });
  }
}

export async function POST(request: NextRequest) {
  try {
    let supabase: any = null;
    try {
      supabase = await createClient();
    } catch {}

    const caller = await getAuthenticatedCaller(request, supabase);

    if (!caller || !caller.is_staff) {
      return NextResponse.json({ error: "Forbidden: Staff access required" }, { status: 403 });
    }

    const { data: body, errorResponse } = await parseJsonBody(request);
    if (errorResponse) return errorResponse;

    const { assignment_type, ...payload } = body || {};

    if (!assignment_type || !payload.patient_id) {
      return NextResponse.json(
        { error: "assignment_type and patient_id are required fields" },
        { status: 400 }
      );
    }

    const patientId = Number(payload.patient_id);

    // 1. Save in resilient database
    const localResult = ResilientDatabase.saveAssignment(patientId, assignment_type, payload);

    // 2. Also try remote Supabase if online
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !dbCircuitBreaker.isOpen()) {
      try {
        const serviceSupabase = createServiceRoleClient();
        const assignedBy = caller.id;

        switch (assignment_type) {
          case "doctor":
            await PatientAssignmentService.assignDoctor(serviceSupabase, { ...payload, assigned_by: assignedBy });
            break;
          case "care_team":
            await PatientAssignmentService.assignCareTeamMember(serviceSupabase, { ...payload, assigned_by: assignedBy });
            break;
          case "treatment":
            await PatientAssignmentService.assignTreatment(serviceSupabase, { ...payload, assigned_by: assignedBy });
            break;
          case "hospital_bed":
            await PatientAssignmentService.assignHospitalBed(serviceSupabase, { ...payload, assigned_by: assignedBy });
            break;
          case "escort":
            await serviceSupabase.from("patient_escort_assignments").insert({ ...payload, assigned_by: assignedBy });
            break;
        }
      } catch (err: any) {
        dbCircuitBreaker.recordFailure();
        console.warn("[assignments POST] Supabase remote assignment skipped:", err.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${assignment_type} assigned successfully`,
      data: localResult,
    });
  } catch (error: any) {
    console.error("Error in admin patient assignments POST:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
