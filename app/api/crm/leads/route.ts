import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabaseServer";
import { getAuthenticatedCaller } from "@/lib/auth/admin-auth";
import { ResilientDatabase } from "@/lib/fallback/mockDatabase";

export async function GET(request: NextRequest) {
  try {
    let supabase: any = null;
    try {
      supabase = await createClient();
    } catch {}

    const caller = await getAuthenticatedCaller(request, supabase);

    if (!caller || !caller.is_staff) {
      return NextResponse.json({ error: "Forbidden: Staff access required" }, { status: 403 });
    }

    let leads = ResilientDatabase.getLeads();

    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const query = supabase
          .from("leads")
          .select("*, official_coordinators(id, full_name, phone)")
          .order("created_at", { ascending: false });

        const timeout = new Promise<{ data: any; error: any }>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 2000)
        );
        const { data, error }: any = await Promise.race([query, timeout]);

        if (!error && data && data.length > 0) {
          leads = data;
        }
      } catch {
        // Fall back to resilient database
      }
    }

    return NextResponse.json({ data: leads });
  } catch (error: any) {
    console.error("Error fetching leads:", error);
    return NextResponse.json({ data: ResilientDatabase.getLeads() });
  }
}

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const {
      patient_name,
      full_name,
      email,
      phone,
      country,
      treatment_requested,
      treatment,
      notes,
      description,
      source,
    } = body;

    const leadName = patient_name || full_name;
    const leadTreatment = treatment_requested || treatment;
    const leadNotes = notes || description;

    if (!leadName || !email || !country) {
      return NextResponse.json(
        { error: "Missing required fields (patient_name, email, country)" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // 1. Add to resilient in-memory database
    const newLead = ResilientDatabase.createLead({
      patient_name: leadName,
      email,
      phone: phone || "",
      country,
      treatment_requested: leadTreatment || "General Inquiry",
      notes: leadNotes || "",
      source: source || "website",
      status: "New",
    });

    // 2. Try remote Supabase if online
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const serviceSupabase = createServiceRoleClient();
        await serviceSupabase.from("leads").insert({
          patient_name: leadName,
          email,
          phone: phone || "",
          country,
          treatment_requested: leadTreatment || "General Inquiry",
          notes: leadNotes || "",
          source: source || "website",
          status: "New",
        });
      } catch (err: any) {
        console.warn("[leads] Supabase remote insert skipped:", err.message);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Consultation inquiry received successfully",
        data: newLead,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating lead:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
