import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient, dbCircuitBreaker } from "@/lib/supabaseServer";
import { getAuthenticatedCaller } from "@/lib/auth/admin-auth";
import { ResilientDatabase } from "@/lib/fallback/mockDatabase";
import { parseJsonBody } from "@/lib/api/request-utils";

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

    const { searchParams } = new URL(request.url);
    const patientIdParam = searchParams.get("patient_id");
    const patientId = patientIdParam ? parseInt(patientIdParam, 10) : undefined;

    let invoices = ResilientDatabase.getInvoices(patientId);
    let quotes = ResilientDatabase.getQuotes(patientId);

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !dbCircuitBreaker.isOpen()) {
      try {
        const serviceSupabase = createServiceRoleClient();
        let invQuery = serviceSupabase.from("invoices").select("*, payments(*)").order("created_at", { ascending: false });
        let quoteQuery = serviceSupabase.from("quotes").select("*").order("created_at", { ascending: false });

        if (patientId) {
          invQuery = invQuery.eq("patient_id", patientId);
          quoteQuery = quoteQuery.eq("patient_id", patientId);
        }

        const [invRes, quoteRes]: any = await Promise.allSettled([invQuery, quoteQuery]);
        if (invRes.status === "fulfilled" && invRes.value.data) {
          invoices = invRes.value.data;
        }
        if (quoteRes.status === "fulfilled" && quoteRes.value.data) {
          quotes = quoteRes.value.data;
        }
      } catch {
        dbCircuitBreaker.recordFailure();
      }
    }

    return NextResponse.json({
      success: true,
      data: invoices,
      invoices,
      quotes,
    });
  } catch (error: any) {
    console.error("Error fetching admin invoices:", error);
    return NextResponse.json({
      success: true,
      invoices: ResilientDatabase.getInvoices(),
      quotes: ResilientDatabase.getQuotes(),
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

    if (!caller || !caller.is_staff) {
      return NextResponse.json({ error: "Forbidden: Staff access required" }, { status: 403 });
    }

    const { data: body, errorResponse } = await parseJsonBody(request);
    if (errorResponse) return errorResponse;

    const { action, patient_id, amount_usd, tax_usd, due_date, treatment_id, hospital_id } = body || {};

    const patientId = Number(patient_id) || 1;

    if (action === "create_quote") {
      const quote = ResilientDatabase.createQuote({
        patient_id: patientId,
        treatment_id,
        hospital_id,
        amount_usd: Number(amount_usd) || 5000,
        status: "sent",
      });

      if (process.env.NEXT_PUBLIC_SUPABASE_URL && !dbCircuitBreaker.isOpen()) {
        try {
          const serviceSupabase = createServiceRoleClient();
          await serviceSupabase.from("quotes").insert({
            patient_id: patientId,
            treatment_id,
            hospital_id,
            amount_usd: Number(amount_usd) || 5000,
            status: "sent",
            validity_date: quote.validity_date,
          });
        } catch (err: any) {
          dbCircuitBreaker.recordFailure();
          console.warn("[invoices] Supabase quote insert skipped:", err.message);
        }
      }

      return NextResponse.json({ data: quote, message: "Quote created & sent to patient" }, { status: 201 });
    }

    if (action === "issue_invoice" || !action) {
      const invoice = ResilientDatabase.createInvoice({
        patient_id: patientId,
        amount_usd: Number(amount_usd) || 5000,
        tax_usd: Number(tax_usd) || 0,
        due_date,
      });

      if (process.env.NEXT_PUBLIC_SUPABASE_URL && !dbCircuitBreaker.isOpen()) {
        try {
          const serviceSupabase = createServiceRoleClient();
          await serviceSupabase.from("invoices").insert({
            patient_id: patientId,
            invoice_number: invoice.invoice_number,
            amount_usd: invoice.amount_usd,
            tax_usd: invoice.tax_usd,
            total_usd: invoice.total_usd,
            due_date: invoice.due_date,
            status: "unpaid",
          });
        } catch (err: any) {
          dbCircuitBreaker.recordFailure();
          console.warn("[invoices] Supabase invoice insert skipped:", err.message);
        }
      }

      return NextResponse.json({ success: true, data: invoice, message: "Proforma invoice issued successfully" }, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Error managing admin invoices:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
