import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabaseServer";
import { getAuthenticatedCaller } from "@/lib/auth/admin-auth";
import { ResilientDatabase } from "@/lib/fallback/mockDatabase";
import { parseJsonBody } from "@/lib/api/request-utils";
import { sanitizeString } from "@/lib/api/sanitize";

const VALID_ROLES = [
  "admin",
  "super_admin",
  "safety_operator",
  "coordinator",
  "doctor",
  "reception",
  "finance",
  "support",
  "hospital_partner",
];

export async function POST(request: NextRequest) {
  try {
    let supabase: any = null;
    try {
      supabase = await createClient();
    } catch {}

    const caller = await getAuthenticatedCaller(request, supabase);

    if (!caller || !caller.is_staff) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const callerRole = caller.role;
    if (callerRole !== "admin" && callerRole !== "super_admin") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const { data: body, errorResponse } = await parseJsonBody(request);
    if (errorResponse) return errorResponse;

    const { name, email, phone, role, department, country } = body || {};

    const cleanName = sanitizeString(name);
    const cleanEmail = sanitizeString(email).toLowerCase();
    const cleanRole = sanitizeString(role);

    if (!cleanName || !cleanEmail || !cleanRole) {
      return NextResponse.json(
        { error: "name, email, and role are required" },
        { status: 400 }
      );
    }

    if (!VALID_ROLES.includes(cleanRole)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // 1. Add to resilient database
    const newEmployee = ResilientDatabase.addEmployee({
      name: cleanName,
      email: cleanEmail,
      phone: sanitizeString(phone) || "",
      role: cleanRole,
      department: sanitizeString(department) || "Operations",
      country: sanitizeString(country) || "India",
      status: "Active",
    });

    // 2. Try remote Supabase if online
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const serviceSupabase = createServiceRoleClient();
        await serviceSupabase.from("employees").insert({
          name,
          email: email.trim().toLowerCase(),
          phone: phone || "",
          role,
          department: department || "Operations",
          country: country || "India",
          status: "Active",
        });
      } catch (err: any) {
        console.warn("[employee/create] Supabase remote insert skipped:", err.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Employee created successfully",
      employee: newEmployee,
    }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating employee:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
