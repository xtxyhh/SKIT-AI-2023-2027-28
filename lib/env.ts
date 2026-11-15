/**
 * Safe Environment Configuration & Diagnostics Helper for HealWithIndia
 * Provides non-leaking diagnostic status of external integrations.
 */

export interface EnvironmentStatus {
  node_env: string;
  is_production: boolean;
  supabase: {
    configured: boolean;
    has_anon_key: boolean;
    has_service_role_key: boolean;
  };
  auth: {
    has_custom_secret: boolean;
    default_admin_configured: boolean;
  };
  cron: {
    configured: boolean;
  };
}

export function getEnvironmentStatus(): EnvironmentStatus {
  const hasUrl = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder-project")
  );
  const hasAnon = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("placeholder")
  );
  const hasServiceKey = Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
      !process.env.SUPABASE_SERVICE_ROLE_KEY.includes("placeholder")
  );
  const hasCustomSecret = Boolean(process.env.ADMIN_SESSION_SECRET);
  const hasCron = Boolean(
    process.env.CRON_SECRET && process.env.CRON_SECRET.length >= 32
  );

  return {
    node_env: process.env.NODE_ENV || "development",
    is_production: process.env.NODE_ENV === "production",
    supabase: {
      configured: hasUrl,
      has_anon_key: hasAnon,
      has_service_role_key: hasServiceKey,
    },
    auth: {
      has_custom_secret: hasCustomSecret,
      default_admin_configured: Boolean(process.env.DEFAULT_ADMIN_EMAIL),
    },
    cron: {
      configured: hasCron,
    },
  };
}
