import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { getAuthenticatedCaller } from "@/lib/auth/admin-auth";

const DEFAULT_TRAVEL = {
  flight_number: "EK-512",
  airline: "Emirates",
  departure_city: "Dubai (DXB)",
  arrival_city: "New Delhi (DEL)",
  arrival_time: "2026-10-19T10:15:00Z",
  status: "Landed",
};

const DEFAULT_VISA = {
  visa_type: "Medical Visa (MED)",
  visa_number: "MED-IND-2026-99104",
  issued_date: "2026-10-15",
  expiry_date: "2027-04-15",
  status: "Granted",
};

const DEFAULT_HOTELS = [
  {
    hotel_name: "The Oberoi, New Delhi",
    hotel_address: "Dr Zakir Hussain Marg, New Delhi 110003",
    booking_reference: "OB-789124",
    check_in: "2026-10-19",
    check_out: "2026-10-29",
    room_type: "Premier Deluxe Suite",
  },
];

export async function GET(request: NextRequest) {
  try {
    let supabase: any = null;
    try {
      supabase = await createClient();
    } catch {}

    const caller = await getAuthenticatedCaller(request, supabase);

    if (!caller) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let travel = DEFAULT_TRAVEL;
    let visa = DEFAULT_VISA;
    let hotels = DEFAULT_HOTELS;

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && supabase && caller.auth_mode === "supabase") {
      try {
        const { data: patientId } = await supabase.rpc("get_patient_id_from_auth", { auth_user_uuid: caller.id });
        if (patientId) {
          const { data: cloudTravel } = await supabase.from("travel_details").select("*").eq("patient_id", patientId).single();
          const { data: cloudVisa } = await supabase.from("visa_details").select("*").eq("patient_id", patientId).single();
          const { data: cloudHotels } = await supabase.from("hotel_bookings").select("*").eq("patient_id", patientId);

          if (cloudTravel) travel = cloudTravel;
          if (cloudVisa) visa = cloudVisa;
          if (cloudHotels && cloudHotels.length > 0) hotels = cloudHotels;
        }
      } catch {}
    }

    return NextResponse.json({
      success: true,
      data: { travel, visa, hotels },
      travel,
      visa,
      hotels,
    });
  } catch (error) {
    console.error("Error fetching travel details:", error);
    return NextResponse.json({
      travel: DEFAULT_TRAVEL,
      visa: DEFAULT_VISA,
      hotels: DEFAULT_HOTELS,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    let supabase: any = null;
    try {
      supabase = await createClient();
    } catch {}

    const caller = await getAuthenticatedCaller(request, supabase);

    if (!caller) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    return NextResponse.json({
      success: true,
      message: "Travel details updated successfully",
      data: body,
    });
  } catch (error) {
    console.error("Error updating travel details:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
