import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import crypto from "crypto";

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: "super_admin" | "admin" | "safety_operator" | "coordinator";
  is_staff: boolean;
  auth_mode: "supabase" | "local_resilient";
}

const ADMIN_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "healwithindia-secure-admin-secret-key-2026";

export const DEFAULT_ADMIN_CREDENTIALS = {
  email: process.env.DEFAULT_ADMIN_EMAIL || "admin@healwithindia.com",
  password: process.env.DEFAULT_ADMIN_PASSWORD || "admin123",
  full_name: "Operations Administrator",
  role: "super_admin" as const,
};

export const ADMIN_COOKIE_NAME = "hwi_admin_session";

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

    if (
      !crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      )
    ) {
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
 * Server-side helper to check if current request has a valid admin session.
 * Works seamlessly in Route Handlers, Server Components, and Middleware.
 */
export async function getAuthenticatedAdmin(
  requestOrCookies?: NextRequest | Headers
): Promise<AdminUser | null> {
  let token: string | undefined;

  if (requestOrCookies && "cookies" in requestOrCookies) {
    // NextRequest in middleware or route
    token = requestOrCookies.cookies.get(ADMIN_COOKIE_NAME)?.value;
  } else {
    // Server Component or Route Handler using next/headers
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    } catch {
      // Cookies not accessible in this context
    }
  }

  if (token) {
    const user = verifyAdminSessionToken(token);
    if (user) return user;
  }

  return null;
}
