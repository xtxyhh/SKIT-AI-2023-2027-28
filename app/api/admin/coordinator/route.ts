import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient, dbCircuitBreaker, safeSupabaseQuery } from "@/lib/supabaseServer";
import { getAuthenticatedCaller } from "@/lib/auth/admin-auth";
import { ResilientDatabase } from "@/lib/fallback/mockDatabase";
import { parseJsonBody } from "@/lib/api/request-utils";

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

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !dbCircuitBreaker.isOpen()) {
      try {
        const serviceSupabase = createServiceRoleClient();
        const query = serviceSupabase
          .from("official_coordinators")
          .select("*")
          .order("created_at", { ascending: false });

        const { data, error } = await safeSupabaseQuery(query, coordinatorsData, 2000);

        if (!error && data && data.length > 0) {
          coordinatorsData = data;
        }
      } catch {
        dbCircuitBreaker.recordFailure();
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

    const { data: body, errorResponse } = await parseJsonBody(request);
    if (errorResponse) return errorResponse;

    const { reference_id, full_name, phone, email, assigned_region, is_active } = body || {};

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
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !dbCircuitBreaker.isOpen()) {
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
        dbCircuitBreaker.recordFailure();
        console.warn("[coordinator POST] Supabase remote insert skipped:", err.message);
      }
    }

    return NextResponse.json({ success: true, data: newCoord }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating coordinator:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// 3. PATCH - Update coordinator status/partial fields
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

    const { data: body, errorResponse } = await parseJsonBody(request);
    if (errorResponse) return errorResponse;

    const { id, is_active } = body || {};

    if (!id) {
      return NextResponse.json({ error: "Coordinator id is required" }, { status: 400 });
    }

    ResilientDatabase.updateCoordinator(id, {
      ...(is_active !== undefined ? { is_active } : {}),
    });

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !dbCircuitBreaker.isOpen()) {
      try {
        const serviceSupabase = createServiceRoleClient();
        await serviceSupabase
          .from("official_coordinators")
          .update({ is_active })
          .eq("id", id);
      } catch {
        dbCircuitBreaker.recordFailure();
      }
    }

    return NextResponse.json({ success: true, message: "Coordinator updated" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// 4. PUT - Full coordinator update (called by /admin/settings/coordinators modal)
export async function PUT(request: NextRequest) {
  try {
    let supabase: any = null;
    try {
      supabase = await createClient();
    } catch {}

    const caller = await getAuthenticatedCaller(request, supabase);

    if (!caller || !caller.is_staff) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { data: body, errorResponse } = await parseJsonBody(request);
    if (errorResponse) return errorResponse;

    const { id, full_name, reference_id, phone, email, assigned_region, is_active } = body || {};

    if (!id) {
      return NextResponse.json({ error: "Coordinator id is required" }, { status: 400 });
    }

    const updated = ResilientDatabase.updateCoordinator(id, {
      ...(full_name !== undefined ? { full_name } : {}),
      ...(reference_id !== undefined ? { reference_id } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(assigned_region !== undefined ? { assigned_region } : {}),
      ...(is_active !== undefined ? { is_active } : {}),
    });

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !dbCircuitBreaker.isOpen()) {
      try {
        const serviceSupabase = createServiceRoleClient();
        await serviceSupabase
          .from("official_coordinators")
          .update({
            ...(full_name ? { full_name } : {}),
            ...(reference_id ? { reference_id } : {}),
            ...(phone ? { phone } : {}),
            ...(email ? { email } : {}),
            ...(assigned_region ? { assigned_region } : {}),
            ...(is_active !== undefined ? { is_active } : {}),
          })
          .eq("id", id);
      } catch {
        dbCircuitBreaker.recordFailure();
      }
    }

    return NextResponse.json({ success: true, data: updated, message: "Coordinator updated successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// 5. DELETE - Remove coordinator (called by /admin/settings/coordinators)
export async function DELETE(request: NextRequest) {
  try {
    let supabase: any = null;
    try {
      supabase = await createClient();
    } catch {}

    const caller = await getAuthenticatedCaller(request, supabase);

    if (!caller || !caller.is_staff) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Coordinator id is required" }, { status: 400 });
    }

    ResilientDatabase.deleteCoordinator(id);

    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const serviceSupabase = createServiceRoleClient();
        await serviceSupabase
          .from("official_coordinators")
          .delete()
          .eq("id", id);
      } catch {}
    }

    return NextResponse.json({ success: true, message: "Coordinator deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
