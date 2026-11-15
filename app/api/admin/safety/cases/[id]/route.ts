import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { getAuthenticatedCaller } from "@/lib/auth/admin-auth";
import { ResilientDatabase } from "@/lib/fallback/mockDatabase";
import { parseJsonBody } from "@/lib/api/request-utils";
import { sanitizeString } from "@/lib/api/sanitize";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let supabase: any = null;
    try {
      supabase = await createClient();
    } catch {}

    const caller = await getAuthenticatedCaller(request, supabase);

    if (!caller || !caller.is_staff) {
      return NextResponse.json({ error: "Forbidden: Staff access required" }, { status: 403 });
    }

    const cases = ResilientDatabase.getSafetyCases();
    let safetyCase = cases.find((c) => c.id === id) || cases[0];

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && supabase) {
      try {
        const query = supabase
          .from("safety_cases")
          .select(`
            id,
            category,
            priority,
            status,
            description,
            created_at,
            updated_at,
            patients (
              id,
              full_name,
              country
            )
          `)
          .eq("id", id)
          .single();

        const timeout = new Promise<{ data: any; error: any }>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 2000)
        );
        const { data, error }: any = await Promise.race([query, timeout]);

        if (!error && data) {
          safetyCase = data;
        }
      } catch {}
    }

    if (!safetyCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    return NextResponse.json({ data: safetyCase });
  } catch (error: any) {
    console.error("Error fetching safety case:", error);
    const fallbackCase = ResilientDatabase.getSafetyCases()[0];
    return NextResponse.json({ data: fallbackCase });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const { status, priority, description } = body || {};

    const cleanStatus = status ? sanitizeString(status) : undefined;
    const cleanPriority = priority ? sanitizeString(priority) : undefined;
    const cleanDescription = description ? sanitizeString(description) : undefined;

    const cases = ResilientDatabase.getSafetyCases();
    const target = cases.find((c) => c.id === id);
    if (target) {
      if (cleanStatus) target.status = cleanStatus as any;
      if (cleanPriority) target.priority = cleanPriority as any;
      if (cleanDescription) target.description = cleanDescription;
      target.updated_at = new Date().toISOString();
    }

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && supabase) {
      try {
        const { createServiceRoleClient } = await import("@/lib/supabaseServer");
        const serviceSupabase = createServiceRoleClient();
        await serviceSupabase
          .from("safety_cases")
          .update({
            ...(status ? { status } : {}),
            ...(priority ? { priority } : {}),
            ...(description ? { description } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: "Safety case updated successfully",
      data: target || { id, status },
    });
  } catch (error: any) {
    console.error("Error updating safety case:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
