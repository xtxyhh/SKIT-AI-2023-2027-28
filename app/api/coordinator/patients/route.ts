import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { getAuthenticatedCaller } from "@/lib/auth/admin-auth";
import { ResilientDatabase } from "@/lib/fallback/mockDatabase";
import { parseJsonBody } from "@/lib/api/request-utils";
import { sanitizeString } from "@/lib/api/sanitize";

export async function GET(request: NextRequest) {
  try {
    let supabase: any = null;
    try {
      supabase = await createClient();
    } catch {}

    const caller = await getAuthenticatedCaller(request, supabase);

    if (!caller || !caller.is_staff) {
      return NextResponse.json({ error: "Forbidden: Coordinator access required" }, { status: 403 });
    }

    let patients: any[] = ResilientDatabase.getPatients();

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && supabase) {
      try {
        const timeout = new Promise<{ data: any; error: any }>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 2000)
        );
        const { data, error }: any = await Promise.race([
          supabase
            .from("patients")
            .select("*, patient_journey_stages(*), visa_details(*), travel_details(*)")
            .order("updated_at", { ascending: false }),
          timeout,
        ]);

        if (!error && data && data.length > 0) {
          patients = data;
        }
      } catch {}
    }

    return NextResponse.json({ success: true, data: patients || [], patients: patients || [] });
  } catch (error: any) {
    console.error("Error fetching coordinator patients:", error);
    return NextResponse.json({ patients: ResilientDatabase.getPatients() });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    let supabase: any = null;
    try {
      supabase = await createClient();
    } catch {}

    const caller = await getAuthenticatedCaller(request, supabase);

    if (!caller || !caller.is_staff) {
      return NextResponse.json({ error: "Forbidden: Coordinator access required" }, { status: 403 });
    }

    const { data: body, errorResponse } = await parseJsonBody(request);
    if (errorResponse) return errorResponse;

    const { patient_id, status, notes } = body || {};

    if (!patient_id) {
      return NextResponse.json({ error: "patient_id is required" }, { status: 400 });
    }

    const cleanStatus = status ? sanitizeString(status) : undefined;
    const cleanNotes = notes ? sanitizeString(notes) : undefined;

    const parsedId = Number(patient_id);
    ResilientDatabase.updatePatient(parsedId, {
      status: cleanStatus,
      notes: cleanNotes ? JSON.stringify({ notes_text: cleanNotes }) : undefined,
    });

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && supabase) {
      try {
        await supabase
          .from("patients")
          .update({
            ...(status ? { status } : {}),
            ...(notes ? { notes } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("id", parsedId);
      } catch {}
    }

    return NextResponse.json({ success: true, message: "Patient updated successfully" });
  } catch (error: any) {
    console.error("Error updating coordinator patient:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
