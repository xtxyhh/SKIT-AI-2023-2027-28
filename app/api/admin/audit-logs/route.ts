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

    if (!caller || !caller.is_staff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let logs = ResilientDatabase.getAuditLogs();

    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const query = supabase
          .from("system_audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100);

        const timeout = new Promise<{ data: any; error: any }>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 2000)
        );
        const { data, error }: any = await Promise.race([query, timeout]);

        if (!error && data && data.length > 0) {
          logs = data;
        }
      } catch {
        // Fall back to resilient audit logs
      }
    }

    return NextResponse.json({ logs: logs || [], data: logs || [] });
  } catch (error: any) {
    console.error("Error fetching audit logs:", error);
    const auditData = ResilientDatabase.getAuditLogs(); return NextResponse.json({ logs: auditData, data: auditData });
  }
}
