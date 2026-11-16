import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient, safeSupabaseQuery } from "@/lib/supabaseServer";
import { getAuthenticatedCaller } from "@/lib/auth/admin-auth";
import { ResilientDatabase } from "@/lib/fallback/mockDatabase";
import { parseJsonBody } from "@/lib/api/request-utils";
import { sanitizeString } from "@/lib/api/sanitize";

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

        const { data, error } = await safeSupabaseQuery(query, leads, 2000);

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
    const { data: body, errorResponse } = await parseJsonBody(request);
    if (errorResponse) return errorResponse;

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
    } = body || {};

    const leadName = sanitizeString(patient_name || full_name);
    const leadEmail = sanitizeString(email).toLowerCase();
    const leadCountry = sanitizeString(country);
    const leadPhone = sanitizeString(phone);
    const leadTreatment = sanitizeString(treatment_requested || treatment);
    const leadNotes = sanitizeString(notes || description);

    if (!leadName || !leadEmail || !leadCountry) {
      return NextResponse.json(
        { error: "Missing required fields (patient_name, email, country)" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(leadEmail)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // 1. Add to resilient in-memory database
    const newLead = ResilientDatabase.createLead({
      patient_name: leadName,
      email: leadEmail,
      phone: leadPhone || "",
      country: leadCountry,
      treatment_requested: leadTreatment || "General Inquiry",
      notes: leadNotes || "",
      source: sanitizeString(source) || "website",
      status: "New",
    });

    // 2. Try remote Supabase if online
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const serviceSupabase = createServiceRoleClient();
        await serviceSupabase.from("leads").insert({
          patient_name: leadName,
          email: leadEmail,
          phone: leadPhone || "",
          country: leadCountry,
          treatment_requested: leadTreatment || "General Inquiry",
          notes: leadNotes || "",
          source: sanitizeString(source) || "website",
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
