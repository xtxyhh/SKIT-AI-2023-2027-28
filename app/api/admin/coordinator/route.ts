import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabaseServer";
import { getAuthenticatedCaller } from "@/lib/auth/admin-auth";
import { ResilientDatabase } from "@/lib/fallback/mockDatabase";

// 1. GET - List all coordinators
export async function GET(request: NextRequest) {
  try {
    let supabase: any = null;
    try {
      supabase = await createClient();
    } catch {}

    const caller = await getAuthenticatedCaller(request, supabase);

    if (!caller || !caller.is_staff) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    let coordinatorsData = ResilientDatabase.getCoordinators();

    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const serviceSupabase = createServiceRoleClient();
        const { data, error } = await serviceSupabase
          .from("official_coordinators")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          coordinatorsData = data;
        }
      } catch {
        // Fall back to resilient database
      }
    }

    return NextResponse.json({ data: coordinatorsData });
  } catch (error: any) {
    return NextResponse.json({ data: ResilientDatabase.getCoordinators() });
  }
}

// 2. POST - Create new coordinator
export async function POST(request: NextRequest) {
  try {
    let supabase: any = null;
    try {
      supabase = await createClient();
    } catch {}

    const caller = await getAuthenticatedCaller(request, supabase);

    if (!caller || !caller.is_staff) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { reference_id, full_name, phone, email, assigned_region, is_active } = body;

    if (!full_name || !phone) {
      return NextResponse.json({ error: "Missing required fields: full_name, phone" }, { status: 400 });
    }

    // 1. Add to resilient database
    const newCoord = ResilientDatabase.addCoordinator({
      reference_id,
      full_name,
      phone,
      email,
      assigned_region,
      is_active: is_active !== false,
    });

    // 2. Try remote Supabase if online
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const serviceSupabase = createServiceRoleClient();
        await serviceSupabase.from("official_coordinators").insert({
          reference_id: newCoord.reference_id,
          full_name,
          phone,
          email: email || `${newCoord.reference_id.toLowerCase()}@healwithindia.com`,
          assigned_region: assigned_region || "Delhi-NCR",
          is_active: is_active !== false,
          is_verified: true,
        });
      } catch (err: any) {
        console.warn("[coordinator POST] Supabase remote insert skipped:", err.message);
      }
    }

    return NextResponse.json({ success: true, data: newCoord }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating coordinator:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// 3. PATCH - Update coordinator
export async function PATCH(request: NextRequest) {
  try {
    let supabase: any = null;
    try {
      supabase = await createClient();
    } catch {}

    const caller = await getAuthenticatedCaller(request, supabase);

    if (!caller || !caller.is_staff) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { id, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: "Coordinator id is required" }, { status: 400 });
    }

    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const serviceSupabase = createServiceRoleClient();
        await serviceSupabase
          .from("official_coordinators")
          .update({ is_active })
          .eq("id", id);
      } catch {}
    }

    return NextResponse.json({ success: true, message: "Coordinator updated" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
