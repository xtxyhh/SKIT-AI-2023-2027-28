import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const FALLBACK_URL = "https://placeholder-project.supabase.co";
const FALLBACK_ANON_KEY = "placeholder-anon-key";
const FALLBACK_SERVICE_KEY = "placeholder-service-role-key";

export async function createClient() {
  const cookieStore = await cookies();
  const urlValue = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY;

  return createServerClient(urlValue, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set() {},
      remove() {},
    },
  });
}

// Create a service role client for admin operations.
// This should ONLY be used in server-side API routes, never in client components.
export function createServiceRoleClient() {
  const urlValue = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || FALLBACK_SERVICE_KEY;

  return createSupabaseClient(urlValue, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
