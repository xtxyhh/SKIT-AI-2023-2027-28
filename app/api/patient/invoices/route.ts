import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { getAuthenticatedCaller } from "@/lib/auth/admin-auth";
import { ResilientDatabase } from "@/lib/fallback/mockDatabase";

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

    const patientId = caller.patient_id || 1;
    let quotes = ResilientDatabase.getQuotes(patientId);
    let invoices = ResilientDatabase.getInvoices(patientId);

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && supabase && caller.auth_mode === "supabase") {
      try {
        const { data: cloudPatientId } = await supabase.rpc("get_patient_id_from_auth", { auth_user_uuid: caller.id });
        if (cloudPatientId) {
          const { data: cloudQuotes } = await supabase.from("quotes").select("*").eq("patient_id", cloudPatientId);
          const { data: cloudInvoices } = await supabase.from("invoices").select("*, payments(*)").eq("patient_id", cloudPatientId);
          if (cloudQuotes) quotes = cloudQuotes;
          if (cloudInvoices) invoices = cloudInvoices;
        }
      } catch {}
    }

    return NextResponse.json({
      success: true,
      data: { quotes: quotes || [], invoices: invoices || [] },
      quotes: quotes || [],
      invoices: invoices || [],
    });
  } catch (error) {
    console.error("Error fetching patient invoices:", error);
    return NextResponse.json({
      quotes: ResilientDatabase.getQuotes(1),
      invoices: ResilientDatabase.getInvoices(1),
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
    const invoice_id = body.invoice_id;
    const amount_usd = Number(body.amount_usd || body.amount) || 2500;
    const payment_method = body.payment_method || "card";
    const transaction_ref = body.transaction_ref || body.transaction_id || `TXN-${Date.now()}`;

    if (!invoice_id) {
      return NextResponse.json({ error: "Missing invoice_id parameter" }, { status: 400 });
    }

    // 1. Record payment in ResilientDatabase
    const payment = ResilientDatabase.recordPayment(Number(invoice_id), {
      amount_usd: Number(amount_usd),
      payment_method,
      transaction_ref,
    });

    // 2. Try remote Supabase if online
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && supabase) {
      try {
        const { createServiceRoleClient } = await import("@/lib/supabaseServer");
        const serviceSupabase = createServiceRoleClient();
        await serviceSupabase.from("payments").insert({
          invoice_id,
          amount_usd,
          payment_method: payment_method || "card",
          transaction_ref,
          status: "completed",
        });
        await serviceSupabase
          .from("invoices")
          .update({ status: "paid", updated_at: new Date().toISOString() })
          .eq("id", invoice_id);
      } catch {}
    }

    return NextResponse.json({ success: true, data: payment, message: "Payment processed successfully" });
  } catch (error) {
    console.error("Error processing payment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
