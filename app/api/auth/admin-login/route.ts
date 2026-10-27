import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  DEFAULT_ADMIN_CREDENTIALS,
  ADMIN_COOKIE_NAME,
  createAdminSessionToken,
  AdminUser,
} from "@/lib/auth/admin-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const response = NextResponse.json({ success: true });

    // 1. Check if matches default local/demo admin credentials
    const matchesDefaultAdmin =
      trimmedEmail === DEFAULT_ADMIN_CREDENTIALS.email.toLowerCase() &&
      password === DEFAULT_ADMIN_CREDENTIALS.password;

    // 2. Also attempt remote Supabase authentication if configured
    let supabaseSuccess = false;
    let supabaseUser: any = null;

    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      try {
        const supabase = createServerClient(
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

        // Run with a 2.5-second timeout to avoid hanging if DNS/remote is dead
        const authPromise = supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) =>
          setTimeout(() => reject(new Error("Supabase auth timeout")), 2500)
        );

        const { data, error } = await Promise.race([authPromise, timeoutPromise]);

        if (!error && data?.user) {
          const role = data.user.app_metadata?.role;
          const isStaff =
            data.user.user_metadata?.is_staff === true ||
            (role && role !== "patient");

          if (isStaff) {
            supabaseSuccess = true;
            supabaseUser = data.user;
          }
        }
      } catch (err: any) {
        console.warn("[AdminLogin] Supabase remote auth skipped or unreachable:", err.message);
      }
    }

    // 3. Evaluate Authentication
    if (supabaseSuccess && supabaseUser) {
      const adminUser: AdminUser = {
        id: supabaseUser.id,
        email: supabaseUser.email,
        full_name:
          supabaseUser.user_metadata?.full_name ||
          supabaseUser.email?.split("@")[0] ||
          "Administrator",
        role: supabaseUser.app_metadata?.role || "admin",
        is_staff: true,
        auth_mode: "supabase",
      };

      const token = createAdminSessionToken(adminUser);

      // Set cookie on response
      response.cookies.set({
        name: ADMIN_COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });

      return NextResponse.json(
        {
          success: true,
          message: "Authenticated via Supabase Cloud",
          user: adminUser,
        },
        { headers: response.headers }
      );
    }

    if (matchesDefaultAdmin) {
      const adminUser: AdminUser = {
        id: "admin-master-001",
        email: DEFAULT_ADMIN_CREDENTIALS.email,
        full_name: DEFAULT_ADMIN_CREDENTIALS.full_name,
        role: DEFAULT_ADMIN_CREDENTIALS.role,
        is_staff: true,
        auth_mode: "local_resilient",
      };

      const token = createAdminSessionToken(adminUser);

      const res = NextResponse.json({
        success: true,
        message: "Authenticated via Resilient Admin Mode",
        user: adminUser,
        mode: "local_resilient",
      });

      res.cookies.set({
        name: ADMIN_COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      });

      return res;
    }

    // If neither matched
    return NextResponse.json(
      {
        error:
          "Invalid email or password. Use demo admin credentials (admin@healwithindia.com / admin123) or your registered Supabase credentials.",
      },
      { status: 401 }
    );
  } catch (error: any) {
    console.error("[AdminLogin] Unexpected error:", error);
    return NextResponse.json(
      { error: "Authentication system error. Please try again." },
      { status: 500 }
    );
  }
}
