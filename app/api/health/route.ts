import { NextResponse } from "next/server";
import { dbCircuitBreaker } from "@/lib/supabaseServer";
import { ResilientDatabase } from "@/lib/fallback/mockDatabase";
import { getEnvironmentStatus } from "@/lib/env";

export async function GET() {
  const startTime = Date.now();
  const env = getEnvironmentStatus();
  const circuitBreakerStatus = dbCircuitBreaker.getStatus();

  const mem = process.memoryUsage();
  const formatMB = (bytes: number) => `${Math.round((bytes / 1024 / 1024) * 100) / 100} MB`;

  const data = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
    version: "0.1.0",
    service: "HealWithIndia Medical Tourism Platform",
    environment: env.node_env,
    checks: {
      database: {
        status: circuitBreakerStatus.state === "OPEN" ? "degraded" : "healthy",
        circuit_breaker: circuitBreakerStatus.state,
        failures: circuitBreakerStatus.failures,
        resilient_fallback: "active",
      },
      catalog: {
        hospitals_loaded: ResilientDatabase.getHospitals().length,
        doctors_loaded: ResilientDatabase.getDoctors().length,
        treatments_loaded: ResilientDatabase.getTreatments().length,
        patients_active: ResilientDatabase.getPatients().length,
      },
      integrations: {
        supabase_cloud: env.supabase.configured ? "configured" : "resilient_local_mode",
        cron_evaluation: env.cron.configured ? "ready" : "disabled",
      },
      system: {
        memory_rss: formatMB(mem.rss),
        heap_used: formatMB(mem.heapUsed),
        latency_ms: Date.now() - startTime,
      },
    },
  };

  return NextResponse.json(data, {
    status: 200,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}

export async function HEAD() {
  return new Response(null, {
    status: 200,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
