import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabaseServer";
import { getAuthenticatedAdmin } from "@/lib/auth/admin-auth";
import { FALLBACK_COORDINATORS } from "@/lib/fallback/mockDatabase";

// 1. GET - List all coordinators
export async function GET(request: NextRequest) {
  try {
    const localAdmin = await getAuthenticatedAdmin(request);
    let isAdmin = !!localAdmin;

    if (!isAdmin) {
      try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (!authError && user) {
          const role = user?.app_metadata?.role;
          isAdmin = role === "admin" || role === "super_admin";
        }
      } catch {
        isAdmin = false;
      }
    }

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    let coordinatorsData: any[] = FALLBACK_COORDINATORS;
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
      coordinatorsData = FALLBACK_COORDINATORS;
    }

    return NextResponse.json({ data: coordinatorsData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. POST - Create new coordinator
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = user?.app_metadata?.role;
    if (role !== "admin" && role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { reference_id, full_name, phone, email, assigned_region, is_active } = body;

    if (!reference_id || !full_name || !phone) {
      return NextResponse.json({ error: "Missing required fields: reference_id, full_name, phone" }, { status: 400 });
    }

    const serviceSupabase = createServiceRoleClient();
    const { data, error } = await serviceSupabase
      .from("official_coordinators")
      .insert({
        reference_id,
        full_name,
        phone,
        email: email || null,
        assigned_region: assigned_region || null,
        is_active: is_active !== undefined ? is_active : true
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Coordinator created successfully", data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 3. PUT - Update coordinator
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = user?.app_metadata?.role;
    if (role !== "admin" && role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { id, reference_id, full_name, phone, email, assigned_region, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const serviceSupabase = createServiceRoleClient();
    const updateFields: any = {};
    if (reference_id !== undefined) updateFields.reference_id = reference_id;
    if (full_name !== undefined) updateFields.full_name = full_name;
    if (phone !== undefined) updateFields.phone = phone;
    if (email !== undefined) updateFields.email = email || null;
    if (assigned_region !== undefined) updateFields.assigned_region = assigned_region || null;
    if (is_active !== undefined) updateFields.is_active = is_active;

    const { data, error } = await serviceSupabase
      .from("official_coordinators")
      .update(updateFields)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Coordinator updated successfully", data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 4. DELETE - Delete coordinator
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = user?.app_metadata?.role;
    if (role !== "admin" && role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id parameter is required" }, { status: 400 });
    }

    const serviceSupabase = createServiceRoleClient();
    const { error } = await serviceSupabase
      .from("official_coordinators")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Coordinator deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
