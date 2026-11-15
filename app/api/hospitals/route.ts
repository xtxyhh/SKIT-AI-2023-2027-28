import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { getAuthenticatedCaller } from "@/lib/auth/admin-auth";
import { ResilientDatabase } from "@/lib/fallback/mockDatabase";
import { parseJsonBody } from "@/lib/api/request-utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city");
    const specialty = searchParams.get("specialty");

    let hospitals = ResilientDatabase.getHospitals();

    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const supabase = await createClient();
        let query = supabase.from("hospitals").select("*").order("rating", { ascending: false });

        if (city) {
          query = query.ilike("city", `%${city}%`);
        }
        if (specialty) {
          query = query.contains("specialties", [specialty]);
        }

        const timeout = new Promise<{ data: any; error: any }>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 2000)
        );
        const { data, error }: any = await Promise.race([query, timeout]);

        if (!error && data && data.length > 0) {
          hospitals = data;
        }
      } catch {
        // Fall back to resilient database
      }
    }

    if (city) {
      hospitals = hospitals.filter((h) =>
        h.city.toLowerCase().includes(city.toLowerCase())
      );
    }
    if (specialty) {
      hospitals = hospitals.filter(
        (h) =>
          h.specialties &&
          h.specialties.some((s) => s.toLowerCase().includes(specialty.toLowerCase()))
      );
    }

    return NextResponse.json({ data: hospitals });
  } catch (error: any) {
    console.error("Error fetching hospitals:", error);
    return NextResponse.json({ data: ResilientDatabase.getHospitals() });
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
      city,
      state,
      country,
      accreditation,
      rating,
      image_url,
      description,
      specialties,
      contact_phone,
      contact_email,
      bed_count,
    } = body;

    if (!name || !city) {
      return NextResponse.json({ error: "Missing required fields (name, city)" }, { status: 400 });
    }

    const hospitalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    // 1. Add to resilient in-memory database
    const newHospital = ResilientDatabase.addHospital({
      name,
      slug: hospitalSlug,
      city,
      state: state || "India",
      country: country || "India",
      accreditation: accreditation || "JCI & NABH Accredited",
      rating: rating || 4.9,
      image_url: image_url || "/images/medanta.png",
      description: description || "Leading super-specialty hospital.",
      specialties: specialties || ["Multi-Specialty"],
      contact_phone,
      contact_email,
      bed_count: bed_count || 500,
    });

    // 2. Try remote Supabase if online
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const { createServiceRoleClient } = await import("@/lib/supabaseServer");
        const serviceSupabase = createServiceRoleClient();
        await serviceSupabase.from("hospitals").insert({
          name,
          slug: hospitalSlug,
          city,
          state: state || "India",
          country: country || "India",
          accreditation: accreditation || "JCI & NABH Accredited",
          rating: rating || 4.9,
          image_url: image_url || "/images/medanta.png",
          description: description || "",
          specialties: specialties || [],
          contact_phone,
          contact_email,
          bed_count: bed_count || 500,
        });
      } catch (err: any) {
        console.warn("[hospitals] Supabase remote insert skipped:", err.message);
      }
    }

    return NextResponse.json({ data: newHospital }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating hospital:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
