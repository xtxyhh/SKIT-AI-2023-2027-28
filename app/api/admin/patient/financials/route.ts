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
      return NextResponse.json({ error: "Forbidden: Operations access required" }, { status: 403 });
    }

    const body = await request.json();
    const {
      patient_id,
      estimated_cost,
      paid_amount,
      currency,
      invoice_status,
      notes_text,
      full_name,
      email,
      phone,
      country,
      treatment,
      assigned_hospital,
      assigned_coordinator_id,
      journey_stage,
      risk_level,
      flight_number,
      flight_departure_time,
      hotel_name,
      hotel_address,
      hotel_booking_reference,
      doctor_name,
      treatment_plan_summary,
      allergies,
      blood_group,
      emergency_contacts,
      medical_history,
    } = body;

    if (!patient_id) {
      return NextResponse.json({ error: "patient_id is required" }, { status: 400 });
    }

    const parsedId = Number(patient_id);

    const notesJSON = JSON.stringify({
      notes_text: notes_text || "",
      estimated_cost: Number(estimated_cost) || 0,
      paid_amount: Number(paid_amount) || 0,
      currency: currency || "USD",
      invoice_status: invoice_status || "UNPAID",
      flight_number: flight_number || "",
      flight_departure_time: flight_departure_time || "",
      hotel_name: hotel_name || "",
      hotel_address: hotel_address || "",
      hotel_booking_reference: hotel_booking_reference || "",
      doctor_name: doctor_name || "",
      treatment_plan_summary: treatment_plan_summary || "",
      allergies: allergies || "",
      blood_group: blood_group || "",
      emergency_contacts: emergency_contacts || "",
      medical_history: medical_history || "",
    });

    // 1. Update resilient in-memory database
    const updatedPatient = ResilientDatabase.updatePatient(parsedId, {
      full_name: full_name || undefined,
      email: email || undefined,
      phone: phone || undefined,
      country: country || undefined,
      treatment: treatment || undefined,
      assigned_hospital: assigned_hospital || undefined,
      notes: notesJSON,
      estimated_revenue: Number(estimated_cost) || 0,
    });

    // 2. Try remote Supabase if online
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const serviceSupabase = createServiceRoleClient();
        await serviceSupabase
          .from("patients")
          .update({
            full_name: full_name || undefined,
            email: email || undefined,
            phone: phone || undefined,
            country: country || undefined,
            treatment: treatment || undefined,
            assigned_hospital: assigned_hospital || undefined,
            notes: notesJSON,
            estimated_revenue: Number(estimated_cost) || 0,
            updated_at: new Date().toISOString(),
          })
          .eq("id", parsedId);
      } catch (err: any) {
        console.warn("[patient/financials] Supabase remote update skipped:", err.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Patient profile and financials updated successfully",
      data: updatedPatient,
    });
  } catch (error: any) {
    console.error("Error updating patient financials:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
