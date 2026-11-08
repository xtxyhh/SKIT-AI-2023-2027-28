import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { getAuthenticatedCaller } from "@/lib/auth/admin-auth";
import { ResilientDatabase } from "@/lib/fallback/mockDatabase";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    let supabase: any = null;
    try {
      supabase = await createClient();
    } catch {}

    const caller = await getAuthenticatedCaller(request, supabase);

    if (!caller || !caller.is_staff) {
      return NextResponse.json({ error: "Forbidden: Staff access required" }, { status: 403 });
    }

    const body = await request.json();
    const { action, notes } = body;

    if (!action) {
      return NextResponse.json({ error: "Missing action" }, { status: 400 });
    }

    const cases = ResilientDatabase.getSafetyCases();
    const target = cases.find((c) => c.id === id) || cases[0];

    if (target) {
      if (action === "acknowledge") target.status = "acknowledged";
      if (action === "resolve") target.status = "resolved";
      if (action === "escalate") target.status = "escalated";
      target.updated_at = new Date().toISOString();
    }

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && supabase) {
      try {
        const { createServiceRoleClient } = await import("@/lib/supabaseServer");
        const serviceSupabase = createServiceRoleClient();
        await serviceSupabase
          .from("safety_cases")
          .update({
            status: action === "resolve" ? "resolved" : action === "acknowledge" ? "acknowledged" : "in_progress",
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);
      } catch {}
    }

    return NextResponse.json({
      success: true,
      message: `Case ${action}d successfully`,
      data: target,
    });
  } catch (error: any) {
    console.error("Error managing safety case response:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
