import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedAdmin, getAuthenticatedCaller } from "@/lib/auth/admin-auth";
import { createClient } from "@/lib/supabaseServer";

export async function GET(request: NextRequest) {
  try {
    let supabase: any = null;
    try { supabase = await createClient(); } catch {}
    const caller = await getAuthenticatedCaller(request, supabase);

    let supabaseReachable = false;
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 1500);
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`,
          {
            signal: controller.signal,
            headers: {
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
            },
          }
        );
        clearTimeout(timeout);
        supabaseReachable = res.status < 500;
      } catch {
        supabaseReachable = false;
      }
    }

    return NextResponse.json({
      authenticated: !!caller,
      user: caller || null,
      backend_status: {
        supabase_connected: supabaseReachable,
        mode: supabaseReachable ? "cloud_live" : "local_resilient",
        database_url: process.env.NEXT_PUBLIC_SUPABASE_URL || "not_configured",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { authenticated: false, error: error.message },
      { status: 500 }
    );
  }
}
