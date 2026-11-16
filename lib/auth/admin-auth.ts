import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import crypto from "crypto";

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: "super_admin" | "admin" | "safety_operator" | "coordinator" | "finance" | "doctor";
  is_staff: boolean;
  auth_mode: "supabase" | "local_resilient";
}

export interface PatientUser {
  id: string;
  patient_id: number;
  email: string;
  full_name: string;
  role: "patient";
  is_staff: false;
  auth_mode: "supabase" | "local_resilient";
}

export interface AuthenticatedCaller {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_staff: boolean;
  is_admin: boolean;
  is_patient: boolean;
  patient_id?: number;
  auth_mode: "supabase" | "local_resilient";
}

const CONFIG_ADMIN_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const isBuildPhase =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.npm_lifecycle_event === "build";

if (!CONFIG_ADMIN_SECRET && process.env.NODE_ENV === "production" && !isBuildPhase) {
  throw new Error("FATAL SECURITY ERROR: ADMIN_SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY must be set in production.");
}

const ADMIN_SECRET =
  CONFIG_ADMIN_SECRET || "healwithindia-dev-fallback-secret-2026";

export const DEFAULT_ADMIN_CREDENTIALS = {
  email: process.env.DEFAULT_ADMIN_EMAIL || "admin@healwithindia.com",
  password: process.env.DEFAULT_ADMIN_PASSWORD || "admin123",
  full_name: "Operations Administrator",
  role: "super_admin" as const,
};

export const AUTHORIZED_ADMIN_USERS: Array<{
  email: string;
  password: string;
  full_name: string;
  role: "super_admin" | "admin" | "safety_operator" | "coordinator" | "finance" | "doctor";
}> = [
  {
    email: "tanishqgupta891@gmail.com",
    password: "healwithindia",
    full_name: "Tanishq Gupta",
    role: "super_admin",
  },
  {
    email: process.env.DEFAULT_ADMIN_EMAIL || "admin@healwithindia.com",
    password: process.env.DEFAULT_ADMIN_PASSWORD || "admin123",
    full_name: "Operations Administrator",
    role: "super_admin",
  },
  {
    email: "admin@healwithindia.com",
    password: "admin123",
    full_name: "Operations Administrator",
    role: "super_admin",
  },
  {
    email: "safety@healwithindia.com",
    password: "admin123",
    full_name: "Safety Command Officer",
    role: "safety_operator",
  },
  {
    email: "aman.verma@healwithindia.com",
    password: "admin123",
    full_name: "Aman Verma",
    role: "coordinator",
  },
];

export const DEFAULT_PATIENT_CREDENTIALS = {
  email: "patient@healwithindia.com",
  password: "patient123",
  full_name: "Tariq Al-Mansoor",
  patient_id: 1,
};

export const AUTHORIZED_PATIENT_USERS: Array<{
  email: string;
  password: string;
  full_name: string;
  patient_id: number;
}> = [
  {
    email: "tanishqgupta891@gmail.com",
    password: "healwithindia",
    full_name: "Tanishq Gupta",
    patient_id: 101,
  },
  {
    email: "patient@healwithindia.com",
    password: "patient123",
    full_name: "Tariq Al-Mansoor",
    patient_id: 1,
  },
];

export const ADMIN_COOKIE_NAME = "hwi_admin_session";
export const PATIENT_COOKIE_NAME = "hwi_patient_session";

/**
 * Sign an admin session token: payloadBase64.hmacSignature
 */
export function createAdminSessionToken(user: AdminUser): string {
  const payload = {
    ...user,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    iat: Date.now(),
  };

  const payloadStr = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", ADMIN_SECRET)
    .update(payloadStr)
    .digest("base64url");

  return `${payloadStr}.${signature}`;
}

/**
 * Verify an admin session token
 */
export function verifyAdminSessionToken(token: string): AdminUser | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [payloadStr, signature] = parts;
    const expectedSignature = crypto
      .createHmac("sha256", ADMIN_SECRET)
      .update(payloadStr)
      .digest("base64url");

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(payloadStr, "base64url").toString());
    if (payload.exp && Date.now() > payload.exp) {
      return null; // Expired
    }

    return {
      id: payload.id || "admin-001",
      email: payload.email,
      full_name: payload.full_name || "Administrator",
      role: payload.role || "super_admin",
      is_staff: true,
      auth_mode: payload.auth_mode || "local_resilient",
    };
  } catch {
    return null;
  }
}

/**
 * Sign a patient session token
 */
export function createPatientSessionToken(user: PatientUser): string {
  const payload = {
    ...user,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    iat: Date.now(),
  };

  const payloadStr = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", ADMIN_SECRET)
    .update(payloadStr)
    .digest("base64url");

  return `${payloadStr}.${signature}`;
}

/**
 * Verify a patient session token
 */
export function verifyPatientSessionToken(token: string): PatientUser | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [payloadStr, signature] = parts;
    const expectedSignature = crypto
      .createHmac("sha256", ADMIN_SECRET)
      .update(payloadStr)
      .digest("base64url");

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(payloadStr, "base64url").toString());
    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }

    return {
      id: payload.id || "patient-001",
      patient_id: payload.patient_id || 1,
      email: payload.email,
      full_name: payload.full_name || "Patient",
      role: "patient",
      is_staff: false,
      auth_mode: payload.auth_mode || "local_resilient",
    };
  } catch {
    return null;
  }
}

/**
 * Server-side helper to check if current request has a valid admin session.
 */
export async function getAuthenticatedAdmin(
  requestOrCookies?: NextRequest | Headers
): Promise<AdminUser | null> {
  let token: string | undefined;

  if (requestOrCookies && "cookies" in requestOrCookies) {
    token = requestOrCookies.cookies.get(ADMIN_COOKIE_NAME)?.value;
  }

  if (!token && requestOrCookies) {
    try {
      const rawCookie = "headers" in requestOrCookies
        ? (typeof requestOrCookies.headers.get === "function" ? requestOrCookies.headers.get("cookie") : null)
        : (typeof (requestOrCookies as any).get === "function" ? (requestOrCookies as any).get("cookie") : null);
      if (rawCookie) {
        const match = rawCookie.match(new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE_NAME}=([^;]+)`));
        if (match) token = decodeURIComponent(match[1]);
      }
    } catch {}
  }

  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    } catch {
      // Cookies not accessible
    }
  }

  if (token) {
    const user = verifyAdminSessionToken(token);
    if (user) return user;
  }

  return null;
}

/**
 * Server-side helper to check if current request has a valid patient session.
 */
export async function getAuthenticatedPatient(
  requestOrCookies?: NextRequest | Headers
): Promise<PatientUser | null> {
  let token: string | undefined;

  if (requestOrCookies && "cookies" in requestOrCookies) {
    token = requestOrCookies.cookies.get(PATIENT_COOKIE_NAME)?.value;
  }

  if (!token && requestOrCookies) {
    try {
      const rawCookie = "headers" in requestOrCookies
        ? (typeof requestOrCookies.headers.get === "function" ? requestOrCookies.headers.get("cookie") : null)
        : (typeof (requestOrCookies as any).get === "function" ? (requestOrCookies as any).get("cookie") : null);
      if (rawCookie) {
        const match = rawCookie.match(new RegExp(`(?:^|;\\s*)${PATIENT_COOKIE_NAME}=([^;]+)`));
        if (match) token = decodeURIComponent(match[1]);
      }
    } catch {}
  }

  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(PATIENT_COOKIE_NAME)?.value;
    } catch {
      // Cookies not accessible
    }
  }

  if (token) {
    const patient = verifyPatientSessionToken(token);
    if (patient) return patient;
  }

  return null;
}

/**
 * Universal caller verification helper.
 * Resolves local admin sessions, local patient sessions, and cloud Supabase Auth sessions.
 */
export async function getAuthenticatedCaller(
  request?: NextRequest,
  supabaseClient?: any
): Promise<AuthenticatedCaller | null> {
  // 1. Check local admin session
  const admin = await getAuthenticatedAdmin(request);
  if (admin) {
    const role = admin.role || "admin";
    const isAdmin = role === "admin" || role === "super_admin";
    return {
      id: admin.id,
      email: admin.email,
      full_name: admin.full_name,
      role,
      is_staff: true,
      is_admin: isAdmin,
      is_patient: false,
      auth_mode: "local_resilient",
    };
  }

  // 2. Check local patient session
  const patient = await getAuthenticatedPatient(request);
  if (patient) {
    return {
      id: patient.id,
      email: patient.email,
      full_name: patient.full_name,
      role: "patient",
      is_staff: false,
      is_admin: false,
      is_patient: true,
      patient_id: patient.patient_id,
      auth_mode: "local_resilient",
    };
  }

  // 3. Check Supabase Auth if client is provided or try creating one
  if (supabaseClient) {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) {
        const role = user.app_metadata?.role || "patient";
        const isStaff =
          user.user_metadata?.is_staff === true ||
          (role !== "patient" && role !== undefined);
        const isAdmin = role === "admin" || role === "super_admin";

        return {
          id: user.id,
          email: user.email || "",
          full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
          role,
          is_staff: isStaff,
          is_admin: isAdmin,
          is_patient: role === "patient",
          auth_mode: "supabase",
        };
      }
    } catch {
      // Supabase offline or unauthenticated
    }
  }

  return null;
}

/**
 * Helper to enforce staff-level permissions for any API route.
 */
export async function checkStaffAuthorization(
  request: NextRequest,
  supabase?: any
): Promise<{ authorized: boolean; caller: AuthenticatedCaller | null }> {
  const caller = await getAuthenticatedCaller(request, supabase);
  if (!caller) {
    return { authorized: false, caller: null };
  }

  const staffRoles = ["super_admin", "admin", "coordinator", "safety_operator", "finance", "doctor", "receptionist", "support"];
  const isAuthorized = caller.is_staff || staffRoles.includes(caller.role);

  return { authorized: isAuthorized, caller };
}
