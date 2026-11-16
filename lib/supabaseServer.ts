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

class DatabaseCircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
  private readonly threshold = 3;
  private readonly cooldownMs = 60000; // 60s cooldown

  public isOpen(): boolean {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime > this.cooldownMs) {
        this.state = "HALF_OPEN";
        return false;
      }
      return true;
    }
    return false;
  }

  public recordSuccess(): void {
    this.failures = 0;
    this.state = "CLOSED";
  }

  public recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.threshold) {
      this.state = "OPEN";
    }
  }

  public getStatus() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

export const dbCircuitBreaker = new DatabaseCircuitBreaker();

/**
 * Safely execute a Supabase query with stateful circuit breaker protection and automatic fallback.
 * Guarantees zero unhandled network exceptions and near-instant fallback when offline.
 */
export async function safeSupabaseQuery<T = any>(
  queryInput: PromiseLike<any> | (() => PromiseLike<any>) | any,
  fallbackValue: T,
  timeoutMs: number = 2500
): Promise<{ data: T; isFallback: boolean; error: any }> {
  if (dbCircuitBreaker.isOpen()) {
    return { data: fallbackValue, isFallback: true, error: null };
  }

  try {
    const rawPromise = typeof queryInput === "function" ? queryInput() : queryInput;
    const queryPromise = Promise.resolve(rawPromise);
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Supabase query timeout")), timeoutMs)
    );
    const result: any = await Promise.race([queryPromise, timeout]);

    if (!result || result.error) {
      dbCircuitBreaker.recordFailure();
      return { data: fallbackValue, isFallback: true, error: result?.error || null };
    }
    if (!result.data || (Array.isArray(result.data) && result.data.length === 0)) {
      return { data: fallbackValue, isFallback: true, error: null };
    }
    dbCircuitBreaker.recordSuccess();
    return { data: result.data as T, isFallback: false, error: null };
  } catch (err) {
    dbCircuitBreaker.recordFailure();
    return { data: fallbackValue, isFallback: true, error: err };
  }
}
