import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { getAuthenticatedCaller } from "@/lib/auth/admin-auth";
import { ResilientDatabase } from "@/lib/fallback/mockDatabase";

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

    if (!caller) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cases = ResilientDatabase.getSafetyCases();
    let safetyCase = cases.find((c) => c.id === id) || cases[0];

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && supabase && caller.auth_mode === "supabase") {
      try {
        const { data } = await supabase
          .from("safety_cases")
          .select("*")
          .eq("id", id)
          .single();

        if (data) {
          safetyCase = data;
        }
      } catch {}
    }

    if (!safetyCase) {
      return NextResponse.json({ error: "Safety case not found" }, { status: 404 });
    }

    return NextResponse.json({ data: safetyCase });
  } catch (error) {
    console.error("Error fetching safety case:", error);
    const fallbackCase = ResilientDatabase.getSafetyCases()[0];
    return NextResponse.json({ data: fallbackCase });
  }
}
