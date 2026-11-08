import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { getAuthenticatedCaller } from "@/lib/auth/admin-auth";
import { ResilientDatabase } from "@/lib/fallback/mockDatabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hospitalId = searchParams.get("hospital_id");
    const specialty = searchParams.get("specialty");

    let doctors = ResilientDatabase.getDoctors();

    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const supabase = await createClient();
        let query = supabase.from("doctors").select("*, hospitals(id, name, city)").order("experience_years", { ascending: false });

        if (hospitalId) {
          query = query.eq("hospital_id", hospitalId);
        }
        if (specialty) {
          query = query.ilike("specialty", `%${specialty}%`);
        }

        const timeout = new Promise<{ data: any; error: any }>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 2000)
        );
        const { data, error }: any = await Promise.race([query, timeout]);

        if (!error && data && data.length > 0) {
          doctors = data;
        }
      } catch {
        // Fall back to resilient database
      }
    }

    if (hospitalId) {
      doctors = doctors.filter((d) => d.hospital_id === hospitalId);
    }
    if (specialty) {
      doctors = doctors.filter((d) =>
        d.specialty.toLowerCase().includes(specialty.toLowerCase())
      );
    }

    return NextResponse.json({ data: doctors });
  } catch (error: any) {
    console.error("Error fetching doctors:", error);
    return NextResponse.json({ data: ResilientDatabase.getDoctors() });
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

    const body = await request.json();
    const { hospital_id, full_name, specialty, qualification, experience_years, bio, avatar_url, rating, consultation_fee_usd } = body;

    if (!full_name || !specialty) {
      return NextResponse.json({ error: "Missing required fields (full_name, specialty)" }, { status: 400 });
    }

    // 1. Add to resilient in-memory database
    const newDoc = ResilientDatabase.addDoctor({
      hospital_id,
      full_name,
      specialty,
      qualification,
      experience_years,
      bio,
      avatar_url,
      rating,
      consultation_fee_usd,
    });

    // 2. Try remote Supabase if online
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const { createServiceRoleClient } = await import("@/lib/supabaseServer");
        const serviceSupabase = createServiceRoleClient();
        await serviceSupabase.from("doctors").insert({
          hospital_id: hospital_id || "hosp-001",
          full_name,
          specialty,
          qualification: qualification || "MBBS, MS",
          experience_years: experience_years || 10,
          bio: bio || "",
          avatar_url: avatar_url || "/images/doctors/trehan.jpg",
          rating: rating || 4.9,
          consultation_fee_usd: consultation_fee_usd || 50,
        });
      } catch (err: any) {
        console.warn("[doctors] Supabase remote insert skipped:", err.message);
      }
    }

    return NextResponse.json({ data: newDoc }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating doctor:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
