import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient, dbCircuitBreaker, safeSupabaseQuery } from "@/lib/supabaseServer";
import { getAuthenticatedCaller } from "@/lib/auth/admin-auth";
import { ResilientDatabase } from "@/lib/fallback/mockDatabase";

// Convert an array of objects into RFC-4180 compliant CSV string
function convertToCSV(data: any[], fields: string[]): string {
  if (!data || data.length === 0) return fields.join(",") + "\n";

  const header = fields.join(",");
  const rows = data.map((item) =>
    fields
      .map((field) => {
        let val = item[field];
        if (val === null || val === undefined) val = "";
        if (typeof val === "object") val = JSON.stringify(val);
        const strVal = String(val).replace(/"/g, '""');
        return `"${strVal}"`;
      })
      .join(",")
  );

  return [header, ...rows].join("\n");
}

export async function GET(request: NextRequest) {
  try {
    let supabase: any = null;
    try {
      supabase = await createClient();
    } catch {}

    const caller = await getAuthenticatedCaller(request, supabase);
    if (!caller || !caller.is_staff) {
      return NextResponse.json(
        { error: "Forbidden: Staff credentials required for data export" },
        { status: 403 }
      );
    }

    const allowedRoles = ["super_admin", "admin", "finance", "marketing"];
    if (!allowedRoles.includes(caller.role)) {
      return NextResponse.json(
        { error: "Forbidden: Role does not have data export permissions" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const exportType = (searchParams.get("type") || "patients").toLowerCase();
    const format = (searchParams.get("format") || "json").toLowerCase();

    let exportData: any[] = [];
    let fields: string[] = [];
    let filenamePrefix = "healwithindia";

    switch (exportType) {
      case "patients": {
        filenamePrefix = "patients";
        exportData = ResilientDatabase.getPatients();
        fields = ["id", "full_name", "email", "phone", "country", "treatment", "assigned_hospital", "status", "created_at"];

        if (process.env.NEXT_PUBLIC_SUPABASE_URL && !dbCircuitBreaker.isOpen()) {
          try {
            const serviceSupabase = createServiceRoleClient();
            const { data } = await safeSupabaseQuery(
              serviceSupabase.from("patients").select("*").order("created_at", { ascending: false }),
              exportData,
              2000
            );
            if (data && data.length > 0) exportData = data;
          } catch {
            dbCircuitBreaker.recordFailure();
          }
        }
        break;
      }

      case "invoices": {
        filenamePrefix = "invoices";
        exportData = ResilientDatabase.getInvoices();
        fields = ["id", "invoice_number", "patient_id", "amount_usd", "tax_usd", "total_usd", "status", "due_date", "created_at"];

        if (process.env.NEXT_PUBLIC_SUPABASE_URL && !dbCircuitBreaker.isOpen()) {
          try {
            const serviceSupabase = createServiceRoleClient();
            const { data } = await safeSupabaseQuery(
              serviceSupabase.from("invoices").select("*").order("created_at", { ascending: false }),
              exportData,
              2000
            );
            if (data && data.length > 0) exportData = data;
          } catch {
            dbCircuitBreaker.recordFailure();
          }
        }
        break;
      }

      case "safety": {
        filenamePrefix = "safety_cases";
        exportData = ResilientDatabase.getSafetyCases();
        fields = ["id", "patient_id", "category", "priority", "status", "description", "assigned_coordinator_id", "created_at"];

        if (process.env.NEXT_PUBLIC_SUPABASE_URL && !dbCircuitBreaker.isOpen()) {
          try {
            const serviceSupabase = createServiceRoleClient();
            const { data } = await safeSupabaseQuery(
              serviceSupabase.from("safety_cases").select("*").order("created_at", { ascending: false }),
              exportData,
              2000
            );
            if (data && data.length > 0) exportData = data;
          } catch {
            dbCircuitBreaker.recordFailure();
          }
        }
        break;
      }

      case "audit_logs": {
        filenamePrefix = "audit_logs";
        exportData = ResilientDatabase.getAuditLogs();
        fields = ["id", "action", "performed_by", "details", "ip_address", "created_at"];

        if (process.env.NEXT_PUBLIC_SUPABASE_URL && !dbCircuitBreaker.isOpen()) {
          try {
            const serviceSupabase = createServiceRoleClient();
            const { data } = await safeSupabaseQuery(
              serviceSupabase.from("system_audit_logs").select("*").order("created_at", { ascending: false }),
              exportData,
              2000
            );
            if (data && data.length > 0) exportData = data;
          } catch {
            dbCircuitBreaker.recordFailure();
          }
        }
        break;
      }

      case "leads": {
        filenamePrefix = "crm_leads";
        exportData = ResilientDatabase.getLeads();
        fields = ["id", "full_name", "email", "phone", "country", "treatment_interest", "notes", "status", "created_at"];

        if (process.env.NEXT_PUBLIC_SUPABASE_URL && !dbCircuitBreaker.isOpen()) {
          try {
            const serviceSupabase = createServiceRoleClient();
            const { data } = await safeSupabaseQuery(
              serviceSupabase.from("consultation_inquiries").select("*").order("created_at", { ascending: false }),
              exportData,
              2000
            );
            if (data && data.length > 0) exportData = data;
          } catch {
            dbCircuitBreaker.recordFailure();
          }
        }
        break;
      }

      default:
        return NextResponse.json(
          { error: `Invalid export type: ${exportType}. Allowed: patients, invoices, safety, audit_logs, leads` },
          { status: 400 }
        );
    }

    const timestamp = new Date().toISOString().split("T")[0];

    // CSV format output
    if (format === "csv") {
      const csvContent = convertToCSV(exportData, fields);
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filenamePrefix}-${timestamp}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    // JSON format output
    return NextResponse.json(
      {
        success: true,
        type: exportType,
        format: "json",
        count: exportData.length,
        timestamp: new Date().toISOString(),
        exported_by: caller.email,
        data: exportData,
      },
      {
        status: 200,
        headers: {
          "Content-Disposition": `attachment; filename="${filenamePrefix}-${timestamp}.json"`,
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error: any) {
    console.error("Error exporting admin data:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error during data export" },
      { status: 500 }
    );
  }
}
