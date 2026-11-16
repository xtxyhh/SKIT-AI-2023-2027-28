import { createClient, safeSupabaseQuery } from "@/lib/supabaseServer";
import { getAuthenticatedAdmin } from "@/lib/auth/admin-auth";
import { ResilientDatabase } from "@/lib/fallback/mockDatabase";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  AlertTriangle,
  ArrowLeft,
  FileSearch,
  User,
  Phone,
  Globe,
  ClipboardList,
  Clock,
} from "lucide-react";

export default async function FraudReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getAuthenticatedAdmin();
  let user: any = admin;

  if (!user) {
    try {
      const supabase = await createClient();
      const timeout = new Promise<{ data: any }>((_, reject) =>
        setTimeout(() => reject(new Error("Auth timeout")), 1500)
      );
      const { data }: any = await Promise.race([supabase.auth.getUser(), timeout]);
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
        <p className="text-slate-400 mt-4">You do not have permission to view fraud reports.</p>
      </main>
    );
  }

  const { id } = await params;

  // Check if this matches a safety case in ResilientDatabase
  const safetyCase = ResilientDatabase.getSafetyCases().find((c) => c.id === id);
  const patientRecord = safetyCase ? ResilientDatabase.getPatientById(safetyCase.patient_id) : null;

  let fraudReport: any = {
    id: id || "fr-001",
    title: safetyCase ? "Reported Safety / Fraud Incident" : "Suspicious Medical Billing Discrepancy",
    description: safetyCase?.description || "Hospital billing department submitted quote discrepancy exceeding 40% of baseline rate.",
    report_type: safetyCase?.category === "fraud" ? "suspicious_billing" : (safetyCase?.category || "suspicious_billing"),
    status: safetyCase?.status || "under_investigation",
    priority: safetyCase?.priority || "high",
    severity: safetyCase?.priority || "high",
    created_at: safetyCase?.created_at || new Date().toISOString(),
    patient_id: safetyCase?.patient_id || 1,
    patients: patientRecord ? {
      id: patientRecord.id,
      full_name: patientRecord.full_name,
      country: patientRecord.country,
      email: patientRecord.email,
      phone: patientRecord.phone,
    } : {
      id: 1,
      full_name: "Tariq Al-Mansoor",
      country: "UAE",
      email: "tariq@example.ae",
      phone: "+971 50 123 4567",
    },
  };

  try {
    const supabase = await createClient();
    const query = supabase.from("fraud_reports").select("*, patients(id, full_name, country, email, phone)").eq("id", id).single();
    const { data } = await safeSupabaseQuery<any>(query, null, 2000);

    if (data) {
      fraudReport = {
        ...fraudReport,
        ...data,
        report_type: data.report_type || fraudReport.report_type,
        priority: data.priority || fraudReport.priority,
        status: data.status || fraudReport.status,
      };
    }
  } catch {}

  const statusBadge: Record<string, string> = {
    pending_review: "bg-yellow-500/15 text-yellow-300 border border-yellow-500/20",
    under_investigation: "bg-blue-500/15 text-blue-300 border border-blue-500/20",
    confirmed_fraud: "bg-red-500/15 text-red-300 border border-red-500/20",
    false_positive: "bg-green-500/15 text-green-300 border border-green-500/20",
    resolved: "bg-cyan-500/15 text-cyan-300 border border-cyan-500/20",
  };

  const badgeClass = statusBadge[fraudReport.status] ?? "bg-slate-800 text-slate-300 border border-slate-700";

  return (
    <main className="p-10 text-white">
      <div className="flex flex-col gap-6 mb-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="uppercase tracking-[4px] text-pink-400 text-sm font-semibold">Fraud Response</p>
            <h1 className="text-5xl font-bold mt-3">Fraud Report Details</h1>
            <p className="text-slate-400 mt-3 max-w-2xl">
              Review the suspected fraud event, patient details, and operational notes for the safety team.
            </p>
          </div>
          <Link
            href="/admin/safety"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/80 px-5 py-3 text-sm font-semibold text-blue-300 hover:bg-slate-900 transition"
          >
            <ArrowLeft size={16} /> Back to Safety Operations
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="space-y-6">
          <div className="rounded-[32px] border border-slate-800 bg-slate-950 p-8">
            <div className="flex items-center gap-3 mb-6">
              <ShieldCheck size={24} className="text-pink-400" />
              <h2 className="text-2xl font-bold">Report Summary</h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <p className="text-slate-400 text-sm">Report ID</p>
                <p className="font-semibold text-white">{fraudReport.id}</p>
              </div>

              <div className="space-y-3">
                <p className="text-slate-400 text-sm">Status</p>
                <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${badgeClass}`}>
                  {(fraudReport.status || "under_investigation").replace(/_/g, " ")}
                </span>
              </div>

              <div className="space-y-3">
                <p className="text-slate-400 text-sm">Priority</p>
                <p className="font-semibold text-white capitalize">{fraudReport.priority || fraudReport.severity || "high"}</p>
              </div>

              <div className="space-y-3">
                <p className="text-slate-400 text-sm">Created</p>
                <p className="font-semibold text-slate-100">{new Date(fraudReport.created_at || Date.now()).toLocaleString()}</p>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <div>
                <p className="text-slate-400 text-sm mb-2">Report Type</p>
                <p className="text-white font-semibold capitalize">{(fraudReport.report_type || "suspicious_activity").replace(/_/g, " ")}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm mb-2">Description</p>
                <p className="text-slate-200 whitespace-pre-line">{fraudReport.description}</p>
              </div>
              {fraudReport.contact_method && (
                <div>
                  <p className="text-slate-400 text-sm mb-2">Contact Method</p>
                  <p className="text-slate-200">{fraudReport.contact_method}</p>
                </div>
              )}
              {fraudReport.contact_info && (
                <div>
                  <p className="text-slate-400 text-sm mb-2">Contact Info</p>
                  <p className="text-slate-200">{fraudReport.contact_info}</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-800 bg-slate-950 p-8">
            <div className="flex items-center gap-3 mb-6">
              <ClipboardList size={24} className="text-cyan-400" />
              <h2 className="text-2xl font-bold">Operational Notes</h2>
            </div>
            <p className="text-slate-400 text-sm">
              Use this screen to review the fraud report and coordinate follow-up with the safety and legal teams.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-4">
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-slate-500 text-xs uppercase tracking-[0.2em] mb-2">Suggested Action</p>
                <p className="text-slate-200 text-sm">Escalate confirmed fraud reports immediately, notify the patient, and flag the case for legal review.</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-slate-500 text-xs uppercase tracking-[0.2em] mb-2">Next Step</p>
                <p className="text-slate-200 text-sm">Open the linked patient case or create a dedicated safety case for operational monitoring.</p>
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-[32px] border border-slate-800 bg-slate-950 p-8">
            <div className="flex items-center gap-3 mb-6">
              <User size={24} className="text-green-400" />
              <h2 className="text-2xl font-bold">Patient Details</h2>
            </div>
            {fraudReport.patients ? (
              <div className="space-y-4 text-sm text-slate-300">
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-[0.2em] mb-1">Name</p>
                  <p className="font-semibold text-white">{fraudReport.patients.full_name}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-[0.2em] mb-1">Country</p>
                  <p>{fraudReport.patients.country || "Unknown"}</p>
                </div>
                {fraudReport.patients.email && (
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-[0.2em] mb-1">Email</p>
                    <p>{fraudReport.patients.email}</p>
                  </div>
                )}
                {fraudReport.patients.phone && (
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-[0.2em] mb-1">Phone</p>
                    <p>{fraudReport.patients.phone}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-400">Patient record not available.</p>
            )}
          </div>

          <div className="rounded-[32px] border border-slate-800 bg-slate-950 p-8">
            <div className="flex items-center gap-3 mb-6">
              <Clock size={24} className="text-blue-400" />
              <h2 className="text-2xl font-bold">Report Timing</h2>
            </div>
            <div className="space-y-3 text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Created:</span>
                <span>{new Date(fraudReport.created_at).toLocaleString()}</span>
              </div>
              {fraudReport.updated_at && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Updated:</span>
                  <span>{new Date(fraudReport.updated_at).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
