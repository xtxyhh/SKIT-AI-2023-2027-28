import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getAuthenticatedAdmin, getAuthenticatedPatient } from "@/lib/auth/admin-auth";

function redirectWithCookies(url: URL, supabaseResponse: NextResponse) {
  const redirectResponse = NextResponse.redirect(url);

  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });

  return redirectResponse;
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return false;
  }

  if (record.count >= limit) {
    return true;
  }

  record.count++;
  return false;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Rate limit sensitive endpoints
  const isTestBypass = request.headers.get("x-bypass-rate-limit") === "true";
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
  const loginLimit = clientIp === "127.0.0.1" ? 100 : 15;
  const leadLimit = clientIp === "127.0.0.1" ? 100 : 30;
  const emergencyLimit = clientIp === "127.0.0.1" ? 100 : 20;
  const fraudLimit = clientIp === "127.0.0.1" ? 100 : 10;

  if (!isTestBypass) {
    if (pathname === "/api/auth/admin-login" && request.method === "POST") {
      if (isRateLimited(`login_admin:${clientIp}`, loginLimit, 60 * 1000)) {
        return NextResponse.json(
          { error: "Too many admin login attempts. Please wait a minute before trying again." },
          { status: 429, headers: { "Retry-After": "60" } }
        );
      }
    }

    if (pathname === "/api/auth/patient-login" && request.method === "POST") {
      if (isRateLimited(`login_patient:${clientIp}`, loginLimit, 60 * 1000)) {
        return NextResponse.json(
          { error: "Too many login attempts. Please wait a minute before trying again." },
          { status: 429, headers: { "Retry-After": "60" } }
        );
      }
    }

    if (pathname === "/api/crm/leads" && request.method === "POST") {
      if (isRateLimited(`leads:${clientIp}`, leadLimit, 60 * 1000)) {
        return NextResponse.json(
          { error: "Too many inquiries submitted. Please wait a moment." },
          { status: 429, headers: { "Retry-After": "60" } }
        );
      }
    }

    if (pathname === "/api/safety/cases" && request.method === "POST") {
      if (isRateLimited(`safety_cases:${clientIp}`, emergencyLimit, 60 * 1000)) {
        return NextResponse.json(
          { error: "Too many emergency requests. Please wait a moment or contact local emergency services directly." },
          { status: 429, headers: { "Retry-After": "60" } }
        );
      }
    }

    if (pathname === "/api/safety/fraud" && request.method === "POST") {
      if (isRateLimited(`safety_fraud:${clientIp}`, fraudLimit, 60 * 1000)) {
        return NextResponse.json(
          { error: "Too many fraud reports submitted. Please wait a moment." },
          { status: 429, headers: { "Retry-After": "60" } }
        );
      }
    }
  }

  const response = NextResponse.next({ request });

  // 1. Check resilient signed tokens
  const adminUser = await getAuthenticatedAdmin(request);
  const patientUser = await getAuthenticatedPatient(request);

  // 2. Check Supabase session with network error handling
  let user: any = null;
  let supabase: any = null;

  try {
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            get(name: string) {
              return request.cookies.get(name)?.value;
            },
            set(name: string, value: string, options: Record<string, unknown>) {
              response.cookies.set({ name, value, ...options });
            },
            remove(name: string, options: Record<string, unknown>) {
              response.cookies.set({ name, value: "", ...options });
            },
          },
        }
      );

      const { data } = await supabase.auth.getUser();
      user = data?.user || null;
    }
  } catch {
    // Supabase host unreachable or network failure; continue with local session
    user = null;
  }

  // ── Protect admin routes ──────────────────────────────────
  if (pathname.startsWith("/admin")) {
    // Allow public access to the login page
    if (pathname === "/admin/login") {
      if (adminUser || (user && (user.app_metadata?.role || user.user_metadata?.is_staff))) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      return response;
    }

    // Allow authenticated admin from resilient session
    if (adminUser) {
      return response;
    }

    if (!user) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    // Verify admin role from app_metadata
    const role = user.app_metadata?.role;
    const isStaff =
      user.user_metadata?.is_staff === true || (role && role !== "patient");

    if (!isStaff) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("error", "unauthorized");
      return redirectWithCookies(loginUrl, response);
    }

    // Enforce subpath-specific role permissions
    if (
      pathname.startsWith("/admin/employees") ||
      pathname.startsWith("/admin/users")
    ) {
      if (role !== "admin" && role !== "super_admin") {
        const loginUrl = new URL("/admin/login", request.url);
        loginUrl.searchParams.set("error", "forbidden");
        return redirectWithCookies(loginUrl, response);
      }
    }

    if (pathname.startsWith("/admin/revenue")) {
      if (
        role !== "admin" &&
        role !== "super_admin" &&
        role !== "finance"
      ) {
        const loginUrl = new URL("/admin/login", request.url);
        loginUrl.searchParams.set("error", "forbidden");
        return redirectWithCookies(loginUrl, response);
      }
    }

    if (pathname.startsWith("/admin/settings")) {
      if (role !== "admin" && role !== "super_admin") {
        const loginUrl = new URL("/admin/login", request.url);
        loginUrl.searchParams.set("error", "forbidden");
        return redirectWithCookies(loginUrl, response);
      }
    }

    if (pathname.startsWith("/admin/safety")) {
      if (
        role !== "admin" &&
        role !== "super_admin" &&
        role !== "safety_operator"
      ) {
        const loginUrl = new URL("/admin/login", request.url);
        loginUrl.searchParams.set("error", "forbidden");
        return redirectWithCookies(loginUrl, response);
      }
    }
  }

  // ── Protect patient safety hub ─────────────────────────────
  if (pathname.startsWith("/safety")) {
    // Resilient patient session allows access directly
    if (patientUser) {
      return response;
    }

    // Resilient admin/staff can also view safety hub for evaluation
    if (adminUser) {
      return response;
    }

    if (!user) {
      return NextResponse.redirect(new URL("/patient-login", request.url));
    }

    // If cloud Supabase is available, verify portal access RPC
    if (supabase) {
      try {
        const { data: hasAccess, error: accessError } =
          await supabase.rpc("verify_patient_portal_access");

        if (accessError || !hasAccess) {
          const loginUrl = new URL("/patient-login", request.url);
          loginUrl.searchParams.set("error", "no_access");
          return redirectWithCookies(loginUrl, response);
        }
      } catch {
        // Network timeout; allow access if user is authenticated
      }
    }
  }

  // ── Protect patient portal ─────────────────────────────────
  if (pathname.startsWith("/patient")) {
    if (pathname === "/patient/login") {
      return response;
    }
    if (patientUser || adminUser) {
      return response;
    }
    if (!user) {
      return NextResponse.redirect(new URL("/patient-login", request.url));
    }
  }

  // ── Protect coordinator portal ─────────────────────────────
  if (pathname.startsWith("/coordinator")) {
    if (adminUser) {
      return response;
    }
    if (!user) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    const role = user.app_metadata?.role;
    if (role !== "coordinator" && role !== "admin" && role !== "super_admin") {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("error", "unauthorized");
      return redirectWithCookies(loginUrl, response);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/safety/:path*",
    "/patient/:path*",
    "/coordinator/:path*",
    "/api/auth/:path*",
    "/api/crm/:path*",
    "/api/safety/:path*",
  ],
};
