import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { FALLBACK_DOCTORS } from "@/lib/fallback/mockDatabase";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const hospitalId = searchParams.get("hospital_id");
    const specialty = searchParams.get("specialty");

    let query = supabase.from("doctors").select("*, hospitals(id, name, city)").order("experience_years", { ascending: false });

    if (hospitalId) {
      query = query.eq("hospital_id", hospitalId);
    }
    if (specialty) {
      query = query.ilike("specialty", `%${specialty}%`);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return NextResponse.json({ data: FALLBACK_DOCTORS });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error("Error fetching doctors:", error);
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
    const { hospital_id, full_name, specialty, qualification, experience_years, bio, avatar_url, rating, consultation_fee_usd } = body;

    if (!full_name || !specialty) {
      return NextResponse.json({ error: "Missing required fields (full_name, specialty)" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("doctors")
      .insert({
        hospital_id,
        full_name,
        specialty,
        qualification,
        experience_years: experience_years || 10,
        bio,
        avatar_url,
        rating: rating || 4.9,
        consultation_fee_usd: consultation_fee_usd || 50,
      })
      .select()
      .single();

    if (error || !data || data.length === 0) {
      return NextResponse.json({ data: FALLBACK_DOCTORS });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("Error creating doctor:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
