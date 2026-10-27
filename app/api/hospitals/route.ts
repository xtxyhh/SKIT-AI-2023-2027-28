import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { FALLBACK_HOSPITALS } from "@/lib/fallback/mockDatabase";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city");
    const specialty = searchParams.get("specialty");

    let query = supabase.from("hospitals").select("*").order("rating", { ascending: false });

    if (city) {
      query = query.ilike("city", `%${city}%`);
    }
    if (specialty) {
      query = query.contains("specialties", [specialty]);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return NextResponse.json({ data: FALLBACK_HOSPITALS });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error("Error fetching hospitals:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || (user.app_metadata?.role !== "admin" && user.app_metadata?.role !== "super_admin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, slug, city, state, country, accreditation, rating, image_url, description, specialties, contact_phone, contact_email, bed_count } = body;

    if (!name || !slug || !city) {
      return NextResponse.json({ error: "Missing required fields (name, slug, city)" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("hospitals")
      .insert({
        name,
        slug,
        city,
        state: state || "India",
        country: country || "India",
        accreditation: accreditation || "JCI & NABH Accredited",
        rating: rating || 4.9,
        image_url,
        description,
        specialties: specialties || [],
        contact_phone,
        contact_email,
        bed_count: bed_count || 500,
      })
      .select()
      .single();

    if (error || !data || data.length === 0) {
      return NextResponse.json({ data: FALLBACK_HOSPITALS });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("Error creating hospital:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
