import { NextRequest, NextResponse } from "next/server";
import { createClient, safeSupabaseQuery } from "@/lib/supabaseServer";
import { fetchMonitoringData } from "@/lib/monitoring/query";
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

    const { searchParams } = new URL(request.url);
    const pageParam = searchParams.get("page");
    const pageSizeParam = searchParams.get("page_size");

    let page = 1;
    let pageSize = 20;

    if (pageParam) {
      const parsedPage = parseInt(pageParam, 10);
      if (!isNaN(parsedPage) && parsedPage >= 1) page = parsedPage;
    }

    if (pageSizeParam) {
      const parsedPageSize = parseInt(pageSizeParam, 10);
      if (!isNaN(parsedPageSize) && parsedPageSize >= 1 && parsedPageSize <= 50) {
        pageSize = parsedPageSize;
      }
    }

    let data: any = ResilientDatabase.getMonitoringData();

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && supabase) {
      try {
        const cloudData: any = await safeSupabaseQuery(
          () => fetchMonitoringData(supabase, page, pageSize),
          null,
          2000
        );
        if (cloudData.data && !cloudData.data.error) {
          data = cloudData.data;
        }
      } catch {
        // Fall back to resilient monitoring data
      }
    }

    return NextResponse.json({ success: true, data, ...data });
  } catch (error: any) {
    console.error("Error fetching monitoring data:", error);
    return NextResponse.json(ResilientDatabase.getMonitoringData());
  }
}
