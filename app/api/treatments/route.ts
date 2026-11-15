import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { getAuthenticatedCaller } from "@/lib/auth/admin-auth";
import { ResilientDatabase } from "@/lib/fallback/mockDatabase";
import { parseJsonBody } from "@/lib/api/request-utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    let treatments = ResilientDatabase.getTreatments();

    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const supabase = await createClient();
        let query = supabase.from("treatments").select("*, treatment_packages(*)").order("name");

        if (category) {
          query = query.ilike("category", `%${category}%`);
        }

        const timeout = new Promise<{ data: any; error: any }>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 2000)
        );
        const { data, error }: any = await Promise.race([query, timeout]);

        if (!error && data && data.length > 0) {
          treatments = data;
        }
      } catch {
        // Fall back to resilient database
      }
    }

    if (category) {
      treatments = treatments.filter((t) =>
        t.category.toLowerCase().includes(category.toLowerCase())
      );
    }

    return NextResponse.json(
      { data: treatments },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (error: any) {
    console.error("Error fetching treatments:", error);
    return NextResponse.json(
      { data: ResilientDatabase.getTreatments() },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
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

    const {
      name,
      slug,
      category,
      department,
      description,
      duration_days,
      recovery_days,
      cost_usd_min,
      cost_usd_max,
    } = body;

    if (!name || !category || !cost_usd_min || !cost_usd_max) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const treatmentSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    // 1. Add to resilient in-memory database
    const newTreatment = ResilientDatabase.addTreatment({
      name,
      slug: treatmentSlug,
      category,
      department: department || "Surgical Sciences",
      description: description || "Advanced clinical procedure.",
      duration_days: duration_days || 7,
      recovery_days: recovery_days || 14,
      cost_usd_min,
      cost_usd_max,
    });

    // 2. Try remote Supabase if online
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const { createServiceRoleClient } = await import("@/lib/supabaseServer");
        const serviceSupabase = createServiceRoleClient();
        await serviceSupabase.from("treatments").insert({
          name,
          slug: treatmentSlug,
          category,
          department: department || "Surgical Sciences",
          description: description || "",
          duration_days: duration_days || 7,
          recovery_days: recovery_days || 14,
          cost_usd_min,
          cost_usd_max,
        });
      } catch (err: any) {
        console.warn("[treatments] Supabase remote insert skipped:", err.message);
      }
    }

    return NextResponse.json({ data: newTreatment }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating treatment:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
