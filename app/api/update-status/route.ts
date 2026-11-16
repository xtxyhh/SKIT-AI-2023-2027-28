import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient, dbCircuitBreaker } from "@/lib/supabaseServer";
import { getAuthenticatedCaller } from "@/lib/auth/admin-auth";
import { ResilientDatabase } from "@/lib/fallback/mockDatabase";
import { parseJsonBody } from "@/lib/api/request-utils";
import { sanitizeString } from "@/lib/api/sanitize";

const VALID_STATUSES = [
  "New",
  "Contacted",
  "Consultation",
  "Consultation Scheduled",
  "Documents Received",
  "Hospital Shared",
  "Hospital Assigned",
  "Quotation Sent",
  "Treatment Booked",
  "Treatment Started",
  "Converted",
  "Completed",
  "Closed",
  "Cancelled",
];

export async function POST(req: NextRequest) {
  try {
    let supabase: any = null;
    try {
      supabase = await createClient();
    } catch {}

    const caller = await getAuthenticatedCaller(req, supabase);

    if (!caller) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allowedRoles = ["admin", "super_admin", "coordinator", "reception", "safety_operator"];
    if (!caller.is_staff && !allowedRoles.includes(caller.role)) {
      return NextResponse.json(
        { error: "Forbidden: Insufficient privileges" },
        { status: 403 }
      );
    }

    const { data: body, errorResponse } = await parseJsonBody(req);
    if (errorResponse) return errorResponse;

    const { id, status } = body || {};
    const cleanStatus = sanitizeString(status);

    if (!id || !cleanStatus) {
      return NextResponse.json(
        { error: "id and status are required" },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.includes(cleanStatus)) {
      return NextResponse.json(
        { error: `Invalid status value: ${cleanStatus}` },
        { status: 400 }
      );
    }

    const parsedId = Number(id);
    if (isNaN(parsedId)) {
      return NextResponse.json(
        { error: "id must be a valid number" },
        { status: 400 }
      );
    }

    // 1. Update in-memory resilient database
    ResilientDatabase.updatePatientStatus(parsedId, status);

    // 2. Also update remote Supabase if online
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !dbCircuitBreaker.isOpen()) {
      try {
        const serviceSupabase = createServiceRoleClient();
        await serviceSupabase
          .from("patients")
          .update({
            status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", parsedId);
      } catch (err: any) {
        dbCircuitBreaker.recordFailure();
        console.warn("[update-status] Supabase remote update skipped:", err.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Patient status updated to ${status}`,
      status,
    });
  } catch (error: any) {
    console.error("Error updating patient status:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
