import { createClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import Link from "next/link";
import { fetchMonitoringData } from "@/lib/monitoring/query";
import { getAuthenticatedAdmin } from "@/lib/auth/admin-auth";
import { ResilientDatabase } from "@/lib/fallback/mockDatabase";

import {
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle,
  ArrowRight,
  Filter,
  Activity,
} from "lucide-react";
import { mapToProtectionSignal, getSignalColorClasses, sortBySignalPriority } from "@/lib/safety/protection-signals";

function getTimeSince(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m ago`;
  return `${diffDays}d ${diffHours % 24}h ago`;
}

export default async function SafetyOperationsPage() {
  const admin = await getAuthenticatedAdmin();
  let user: any = admin;

  if (!user) {
    try {
      const supabase = await createClient();
      const timeout = new Promise<{ data: any }>((_, reject) =>
        setTimeout(() => reject(new Error("Auth timeout")), 1500)
      );
      const { data }: any = await Promise.race([
        supabase.auth.getUser(),
        timeout,
      ]);
      if (data?.user) {
        user = {
          id: data.user.id,
          email: data.user.email || "",
          full_name: data.user.user_metadata?.full_name || "Admin",
          role: data.user.app_metadata?.role || "admin",
          is_staff: true,
          auth_mode: "supabase",
        };
      }
    } catch {}
  }

  if (!user) {
    redirect("/admin/login");
  }

  const role = user.role;
  const isAdmin = !role || role === "admin" || role === "super_admin" || role === "safety_operator";

  if (!isAdmin) {
    return (
      <main className="p-10 text-white">
        <h1 className="text-4xl font-bold text-red-400">Access Denied</h1>
        <p className="text-slate-400 mt-4">You do not have permission to access safety operations.</p>
      </main>
    );
  }

  let monitoringData: any = ResilientDatabase.getMonitoringData();
  let safetyCases: any[] = ResilientDatabase.getSafetyCases().map((c) => ({
    ...c,
    patient_id: c.patient_id,
    patients: {
      id: c.patient_id,
      full_name: "Tariq Al-Mansoor",
      country: "UAE",
    },
    patient_safety_profiles: {
      journey_stage: "in_transit",
      protection_status: "ACTIVE",
      protection_activated_at: c.created_at,
    },
  }));
  let fraudReports: any[] = [];

  try {
    const supabase = await createClient();
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), 2500)
    );

    const queryTask = async () => {
      const monData = await fetchMonitoringData(supabase);

      const { data: cases } = await supabase
        .from("safety_cases")
        .select(`
          id,
          category,
          priority,
          status,
          response_state,
          description,
          created_at,
          acknowledged_at,
          assigned_coordinator_id,
          patient_id,
          patients (
            id,
            full_name,
            country
          ),
          patient_safety_profiles (
            journey_stage,
            protection_status,
            protection_activated_at
          )
        `)
        .in("patient_safety_profiles.protection_status", ["ACTIVE", "PREPARING", "SUSPENDED"])
        .order("created_at", { ascending: false })
        .limit(100);

      const { data: frauds } = await supabase
        .from("fraud_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      return { monData, cases, frauds };
    };

    const queryResult = await Promise.race([queryTask(), timeout]) as any;
    if (queryResult?.monData && !queryResult.monData.error) monitoringData = queryResult.monData;
    if (queryResult?.cases && queryResult.cases.length > 0) safetyCases = queryResult.cases;
    if (queryResult?.frauds) fraudReports = queryResult.frauds;
  } catch (e) {
    // Resilient fallback loaded
  }

  const activeCases = safetyCases?.filter(c => c.status !== "closed" && c.status !== "resolved") || [];
  const criticalCases = activeCases.filter(c => c.priority === "critical");
  const highPriorityCases = activeCases.filter(c => c.priority === "high");
  const unacknowledgedCases = activeCases.filter(c => c.status === "open" || c.response_state === "detected");

  // Add protection signal to each case for sorting
  const casesWithSignals = activeCases.map(caseItem => {
    const signal = mapToProtectionSignal(caseItem.status, caseItem.priority, null);
    return { ...caseItem, signal };
  });

  // Sort by signal priority (urgent first)
  const sortedCases = sortBySignalPriority(casesWithSignals);

  // Get monitoring overview data (always populated now — direct DB query, no loopback)
  const overview = monitoringData.overview;

  return (
    <main className="p-10 text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck size={24} className="text-green-400" />
            <span className="text-green-400 font-semibold tracking-wide text-sm">SMART TOURIST PROTECTION OPERATIONS</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">Safety Operations Dashboard</h1>
          <p className="text-slate-400">
            Monitor and manage patient protection cases, urgent assistance requests, and fraud reports
          </p>
        </div>
        <Link
          href="/admin"
          className="text-blue-400 hover:text-blue-300 flex items-center gap-2"
        >
          Back to Dashboard
          <ArrowRight size={16} />
        </Link>
      </div>

      {/* Live Safety Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
        <div className="bg-slate-950 border border-green-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <CheckCircle className="text-green-400" size={20} />
            <span className="text-2xl font-bold">{overview.risk_levels.normal}</span>
          </div>
          <p className="text-slate-400 text-xs">NORMAL</p>
        </div>

        <div className="bg-slate-950 border border-blue-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <Clock className="text-blue-400" size={20} />
            <span className="text-2xl font-bold">{overview.risk_levels.watch}</span>
          </div>
          <p className="text-slate-400 text-xs">WATCH</p>
        </div>

        <div className="bg-slate-950 border border-yellow-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <AlertTriangle className="text-yellow-400" size={20} />
            <span className="text-2xl font-bold">{overview.risk_levels.elevated}</span>
          </div>
          <p className="text-slate-400 text-xs">ELEVATED</p>
        </div>

        <div className="bg-slate-950 border border-orange-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <AlertTriangle className="text-orange-400" size={20} />
            <span className="text-2xl font-bold">{overview.risk_levels.high}</span>
          </div>
          <p className="text-slate-400 text-xs">HIGH</p>
        </div>

        <div className="bg-slate-950 border border-red-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <AlertTriangle className="text-red-400" size={20} />
            <span className="text-2xl font-bold">{overview.risk_levels.critical}</span>
          </div>
          <p className="text-slate-400 text-xs">CRITICAL</p>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <ShieldCheck className="text-blue-400" size={20} />
            <span className="text-2xl font-bold">{overview.active_monitored_journeys}</span>
          </div>
          <p className="text-slate-400 text-xs">Active Monitored Journeys</p>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <AlertTriangle className="text-red-400" size={20} />
            <span className="text-2xl font-bold">{overview.open_incidents}</span>
          </div>
          <p className="text-slate-400 text-xs">Open Incidents</p>
        </div>

        <div className="bg-slate-950 border border-orange-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <Clock className="text-orange-400" size={20} />
            <span className="text-2xl font-bold">{overview.unacknowledged_incidents}</span>
          </div>
          <p className="text-slate-400 text-xs">Unacknowledged</p>
        </div>

        <div className="bg-slate-950 border border-pink-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <Clock className="text-pink-400" size={20} />
            <span className="text-2xl font-bold">{overview.response_delays}</span>
          </div>
          <p className="text-slate-400 text-xs">Response Delays</p>
        </div>
      </div>

      {/* Active Cases Table - Prioritized by Signal */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden mb-10">
        <div className="flex justify-between items-center px-8 py-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Activity size={24} className="text-purple-400" />
            <h2 className="text-2xl font-bold">Active Protection Cases</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-slate-400">
              <Filter size={16} />
              <span className="text-sm">Sorted by priority</span>
            </div>
            <span className="text-sm text-slate-400">{sortedCases.length} cases</span>
          </div>
        </div>

        {sortedCases.length === 0 ? (
          <div className="text-center py-20">
            <ShieldCheck size={70} className="mx-auto text-slate-700" />
            <h2 className="text-2xl font-bold mt-8">No Active Cases</h2>
            <p className="text-slate-400 mt-3">
              All safety cases have been resolved.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900">
                <tr>
                  <th className="text-left px-6 py-4">Patient</th>
                  <th className="text-left px-6 py-4">Journey Stage</th>
                  <th className="text-left px-6 py-4">Issue</th>
                  <th className="text-left px-6 py-4">Priority</th>
                  <th className="text-left px-6 py-4">Response State</th>
                  <th className="text-left px-6 py-4">Time Since</th>
                  <th className="text-left px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedCases.map((caseItem) => {
                  const signalColors = getSignalColorClasses(caseItem.signal.color);
                  return (
                    <tr
                      key={caseItem.id}
                      className="border-b border-slate-800 hover:bg-slate-900/50"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold">
                            {caseItem.patients?.[0]?.full_name || "Unknown"}
                          </p>
                          <p className="text-slate-500 text-sm">
                            {caseItem.patients?.[0]?.country || "Unknown"}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-300 capitalize text-sm">
                        {caseItem.patient_safety_profiles?.[0]?.journey_stage?.replace(/_/g, " ") || "Unknown"}
                      </td>
                      <td className="px-6 py-4 text-slate-300 text-sm max-w-xs">
                        <p className="truncate">{caseItem.category.replace(/_/g, " ")}</p>
                        <p className="text-slate-500 text-xs truncate">{caseItem.description}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${signalColors.badge}`}>
                            {caseItem.signal.label}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            caseItem.priority === "critical" ? "bg-red-500/20 text-red-400" :
                            caseItem.priority === "high" ? "bg-orange-500/20 text-orange-400" :
                            caseItem.priority === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                            "bg-slate-500/20 text-slate-400"
                          }`}>
                            {caseItem.priority}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          caseItem.response_state === "detected" ? "bg-blue-500/20 text-blue-400" :
                          caseItem.response_state === "acknowledged" ? "bg-green-500/20 text-green-400" :
                          caseItem.response_state === "in_response" ? "bg-purple-500/20 text-purple-400" :
                          "bg-slate-500/20 text-slate-400"
                        }`}>
                          {caseItem.response_state?.replace(/_/g, " ") || caseItem.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-sm">
                        {getTimeSince(caseItem.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/safety/case/${caseItem.id}`}
                          className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Fraud Reports - Lower Priority */}
      <div className="bg-slate-950 border border-pink-800 rounded-2xl overflow-hidden">
        <div className="flex justify-between items-center px-8 py-6 border-b border-pink-800">
          <h2 className="text-2xl font-bold">Fraud Reports</h2>
          <div className="flex items-center gap-2 text-pink-400">
            <ShieldCheck size={16} />
            <span className="text-sm">{fraudReports?.length || 0} reports</span>
          </div>
        </div>

        {(!fraudReports || fraudReports.length === 0) ? (
          <div className="text-center py-20">
            <ShieldCheck size={70} className="mx-auto text-slate-700" />
            <h2 className="text-2xl font-bold mt-8">No Fraud Reports</h2>
            <p className="text-slate-400 mt-3">
              No fraud reports have been submitted.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900">
                <tr>
                  <th className="text-left px-6 py-4">Report Type</th>
                  <th className="text-left px-6 py-4">Priority</th>
                  <th className="text-left px-6 py-4">Status</th>
                  <th className="text-left px-6 py-4">Created</th>
                  <th className="text-left px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {fraudReports.map((report) => (
                  <tr
                    key={report.id}
                    className="border-b border-slate-800 hover:bg-slate-900/50"
                  >
                    <td className="px-6 py-4 text-slate-300 capitalize">
                      {report.report_type.replace(/_/g, " ")}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        report.priority === "critical" ? "bg-red-500/20 text-red-400" :
                        report.priority === "high" ? "bg-orange-500/20 text-orange-400" :
                        "bg-slate-500/20 text-slate-400"
                      }`}>
                        {report.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        report.status === "pending_review" ? "bg-yellow-500/20 text-yellow-400" :
                        report.status === "under_investigation" ? "bg-blue-500/20 text-blue-400" :
                        report.status === "confirmed_fraud" ? "bg-red-500/20 text-red-400" :
                        "bg-slate-500/20 text-slate-400"
                      }`}>
                        {report.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {new Date(report.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/safety/fraud/${report.id}`}
                        className="text-pink-400 hover:text-pink-300 text-sm font-medium"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
