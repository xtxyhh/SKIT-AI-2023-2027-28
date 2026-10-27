import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabaseServer";
import { PatientAssignmentService } from "@/lib/services/patientAssignmentService";
import { getAuthenticatedAdmin } from "@/lib/auth/admin-auth";

// Check if user is staff/admin
async function checkAdminOrStaff(request: NextRequest, supabase: any) {
  const localAdmin = await getAuthenticatedAdmin(request);
  if (localAdmin) {
    return { authorized: true, user: localAdmin };
  }
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { authorized: false, user: null };
  }

  const role = user.app_metadata?.role;
  const isStaff =
    role === "admin" ||
    role === "super_admin" ||
    role === "coordinator" ||
    role === "safety_operator";

  return { authorized: isStaff, user };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { authorized } = await checkAdminOrStaff(request, supabase);

    if (!authorized) {
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

    const serviceSupabase = createServiceRoleClient();
    const assignments = await PatientAssignmentService.getCompletePatientAssignments(
      serviceSupabase,
      patientId
    );

    return NextResponse.json({ success: true, data: assignments });
  } catch (error: any) {
    console.error("Error in admin patient assignments GET:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { authorized, user } = await checkAdminOrStaff(request, supabase);

    if (!authorized) {
      return NextResponse.json({ error: "Forbidden: Staff access required" }, { status: 403 });
    }

    const body = await request.json();
    const { assignment_type, ...payload } = body;

    if (!assignment_type || !payload.patient_id) {
      return NextResponse.json(
        { error: "assignment_type and patient_id are required fields" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();
    let result: { success: boolean; data?: any; error?: string };

    switch (assignment_type) {
      case "doctor":
        result = await PatientAssignmentService.assignDoctor(serviceSupabase, {
          ...payload,
          assigned_by: user?.email || "admin",
        });
        break;

      case "care_team":
        result = await PatientAssignmentService.assignCareTeamMember(serviceSupabase, payload);
        break;

      case "treatment":
        result = await PatientAssignmentService.assignTreatment(serviceSupabase, payload);
        break;

      case "hospital_bed":
        result = await PatientAssignmentService.assignHospitalBed(serviceSupabase, payload);
        break;

      default:
        return NextResponse.json(
          { error: `Unsupported assignment_type: ${assignment_type}` },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully created ${assignment_type} assignment`,
      data: result.data,
    });
  } catch (error: any) {
    console.error("Error in admin patient assignments POST:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { authorized } = await checkAdminOrStaff(request, supabase);

    if (!authorized) {
      return NextResponse.json({ error: "Forbidden: Staff access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const table = searchParams.get("table");
    const id = searchParams.get("id");

    const validTables = [
      "patient_doctor_assignments",
      "patient_care_team_assignments",
      "patient_treatment_assignments",
      "patient_hospital_assignments",
      "patient_escort_assignments",
    ];

    if (!table || !id || !validTables.includes(table)) {
      return NextResponse.json(
        { error: "Valid table name and assignment id are required" },
        { status: 400 }
      );
    }

    const serviceSupabase = createServiceRoleClient();
    const { error } = await serviceSupabase.from(table).delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Assignment removed successfully" });
  } catch (error: any) {
    console.error("Error in admin patient assignments DELETE:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
