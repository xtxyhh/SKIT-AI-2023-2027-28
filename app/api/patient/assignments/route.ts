import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { PatientAssignmentService } from "@/lib/services/patientAssignmentService";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Resolve patient_id via get_patient_id_from_auth RPC
    const { data: patientId, error: rpcError } = await supabase.rpc(
      "get_patient_id_from_auth",
      { auth_user_uuid: user.id }
    );

    if (rpcError || !patientId) {
      return NextResponse.json(
        { error: "No patient record associated with current account" },
        { status: 404 }
      );
    }

    const assignments = await PatientAssignmentService.getCompletePatientAssignments(
      supabase,
      patientId
    );

    return NextResponse.json({
      success: true,
      data: assignments,
    });
  } catch (error: any) {
    console.error("Error fetching patient assignments:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
