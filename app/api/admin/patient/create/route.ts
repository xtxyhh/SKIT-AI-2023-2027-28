import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabaseServer";
import { getAuthenticatedCaller } from "@/lib/auth/admin-auth";
import { ResilientDatabase } from "@/lib/fallback/mockDatabase";

export async function POST(request: NextRequest) {
  try {
    let supabase: any = null;
    try {
      supabase = await createClient();
    } catch {}

    const caller = await getAuthenticatedCaller(request, supabase);

    if (!caller || !caller.is_staff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { full_name, email, phone, country, treatment, notes } = body;

    if (!full_name || !email) {
      return NextResponse.json(
        { error: "full_name and email are required" },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Check in-memory database for duplicate
    const existingInLocal = ResilientDatabase.getPatientByEmail(trimmedEmail);
    if (existingInLocal) {
      return NextResponse.json(
        { error: "A patient with this email already exists" },
        { status: 409 }
      );
    }

    // 1. Create in Resilient Database
    const newPatient = ResilientDatabase.createPatient({
      full_name,
      email: trimmedEmail,
      phone: phone || "",
      country: country || "International",
      treatment: treatment || "General Consultation",
      description: notes || "",
      notes: JSON.stringify({ notes_text: notes || "" }),
      status: "New",
    });

    // 2. Try remote Supabase if online
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const serviceSupabase = createServiceRoleClient();
        await serviceSupabase.from("patients").insert({
          full_name,
          email: trimmedEmail,
          phone: phone || "",
          country: country || "International",
          treatment: treatment || "General Consultation",
          notes: notes || "",
          status: "New",
        });
      } catch (err: any) {
        console.warn("[patient/create] Supabase remote insert skipped:", err.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Patient created successfully",
      patient_id: newPatient.id,
      patient: newPatient,
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating patient:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
