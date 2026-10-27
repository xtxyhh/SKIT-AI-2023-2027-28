import { createClient } from "@/lib/supabaseServer";
import { getAuthenticatedAdmin } from "@/lib/auth/admin-auth";
import { FALLBACK_PATIENTS } from "@/lib/fallback/mockDatabase";
import { redirect } from "next/navigation";
import Link from "next/link";

import Topbar from "@/components/Topbar";
import StatsCard from "@/components/StatsCard";
import RevenueChart from "@/components/RevenueChart";
import CountryChart from "@/components/CountryChart";
import ActivityTimeline from "@/components/ActivityTimeline";
import StatusDropdown from "@/components/StatusDropdown";

import {
  Users,
  UserPlus,
  PhoneCall,
  CheckCircle2,
  DollarSign,
  FileText,
  Plus,
  Building2,
  Calendar,
  ShieldCheck,
} from "lucide-react";

type Patient = {
  id: number;
  created_at: string;
  full_name: string | null;
  email: string | null;
  country: string | null;
  treatment: string | null;
  status: string | null;
  report_url: string | null;
  assigned_hospital: string | null;
  estimated_revenue: number | null;
};

const NEW_STATUSES = new Set(["New", null, ""]);
const CONTACTED_STATUSES = new Set(["Consultation", "Hospital Assigned"]);
const CONVERTED_STATUSES = new Set(["Treatment Started", "Completed"]);

function formatCurrency(value: number | null | undefined) {
  return `$${(value ?? 0).toLocaleString()}`;
}

const QUICK_ACTIONS = [
  { label: "Add Lead", href: "/admin/leads?new=1", icon: Plus, color: "bg-blue-600 hover:bg-blue-500" },
  { label: "Add Hospital", href: "/admin/hospitals?new=1", icon: Building2, color: "bg-emerald-600 hover:bg-emerald-500" },
  { label: "Follow Up", href: "/admin/leads?filter=follow-up", icon: Calendar, color: "bg-purple-600 hover:bg-purple-500" },
  { label: "Upload Report", href: "/admin/reports/upload", icon: FileText, color: "bg-cyan-600 hover:bg-cyan-500" },
  { label: "Safety Operations", href: "/admin/safety", icon: ShieldCheck, color: "bg-red-600 hover:bg-red-500" },
] as const;

export default async function AdminPage() {
  const adminUser = await getAuthenticatedAdmin();
  let user = null;

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data?.user || null;
  } catch {
    // Supabase offline / paused
  }

  if (!adminUser && !user) {
    redirect("/admin/login");
  }

  let patients: Patient[] | null = null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      patients = data;
    } else {
      patients = FALLBACK_PATIENTS;
    }
  } catch {
    patients = FALLBACK_PATIENTS;
  }

  const allPatients: Patient[] = patients ?? FALLBACK_PATIENTS;

  const totalLeads = allPatients.length;
  const newLeads = allPatients.filter((p) => NEW_STATUSES.has(p.status ?? "")).length;
  const contactedLeads = allPatients.filter((p) => CONTACTED_STATUSES.has(p.status ?? "")).length;
  const convertedLeads = allPatients.filter((p) => CONVERTED_STATUSES.has(p.status ?? "")).length;
  const totalRevenue = allPatients.reduce((sum, p) => sum + Number(p.estimated_revenue ?? 0), 0);

  const recentPatients = allPatients.slice(0, 8);

  return (
    <main className="min-h-screen bg-[#020817] text-white p-4 sm:p-6 lg:p-10">
      <div className="mx-auto max-w-[1600px]">
        <Topbar />

        {/* STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 mt-8 mb-8 sm:mb-10">
          <StatsCard title="Total Leads" value={totalLeads} icon={Users} color="text-blue-400" />
          <StatsCard title="New Leads" value={newLeads} icon={UserPlus} color="text-emerald-400" />
          <StatsCard title="Contacted" value={contactedLeads} icon={PhoneCall} color="text-cyan-400" />
          <StatsCard title="Converted" value={convertedLeads} icon={CheckCircle2} color="text-purple-400" />
          <div className="col-span-2 lg:col-span-1">
            <StatsCard title="Revenue" value={formatCurrency(totalRevenue)} icon={DollarSign} color="text-yellow-400" />
          </div>
        </div>

        {/* CHARTS */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8 mb-8 sm:mb-10">
          <RevenueChart />
          <CountryChart />
        </div>

        {/* ACTIVITY + QUICK ACTIONS */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8 mb-8 sm:mb-10">
          <ActivityTimeline />

          <div className="bg-slate-950 border border-slate-800 rounded-[28px] sm:rounded-[32px] p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold mb-6 sm:mb-8">Quick Actions</h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
              {QUICK_ACTIONS.map(({ label, href, icon: Icon, color }) => (
                <Link
                  key={label}
                  href={href}
                  className={`${color} rounded-2xl p-5 sm:p-6 transition flex flex-col items-center justify-center text-center gap-3 active:scale-[0.97]`}
                >
                  <Icon size={22} />
                  <span className="text-sm sm:text-base font-medium leading-tight">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* RECENT LEADS */}
        <div className="bg-slate-950 border border-slate-800 rounded-[28px] sm:rounded-[32px] overflow-hidden">
          <div className="flex flex-wrap justify-between items-center gap-4 px-5 sm:px-8 py-6 sm:py-7 border-b border-slate-800">
            <h2 className="text-xl sm:text-2xl font-bold">Recent Patients</h2>
            <Link href="/admin/leads" className="text-blue-400 hover:text-blue-300 transition text-sm sm:text-base font-medium">
              View All →
            </Link>
          </div>

          {recentPatients.length === 0 ? (
            <div className="text-center py-16 sm:py-20 px-6">
              <Users size={64} className="mx-auto text-slate-700" />
              <h2 className="text-xl sm:text-2xl font-bold mt-8">No patients yet</h2>
              <p className="text-slate-400 mt-3">Consultation requests will appear here.</p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-slate-900">
                    <tr className="text-left text-slate-400 text-sm">
                      <th className="px-6 py-5 font-medium">Patient</th>
                      <th className="px-6 py-5 font-medium">Country</th>
                      <th className="px-6 py-5 font-medium">Treatment</th>
                      <th className="px-6 py-5 font-medium">Hospital</th>
                      <th className="px-6 py-5 font-medium">Revenue</th>
                      <th className="px-6 py-5 font-medium">Report</th>
                      <th className="px-6 py-5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPatients.map((patient) => (
                      <tr key={patient.id} className="border-b border-slate-800 last:border-b-0 hover:bg-slate-900/50 transition-colors">
                        <td className="px-6 py-5 max-w-[220px]">
                          <Link href={`/admin/patient/${patient.id}`} className="font-semibold hover:text-blue-400 transition truncate block">
                            {patient.full_name || "Unknown"}
                          </Link>
                          <p className="text-slate-500 text-sm mt-1 truncate">{patient.email || "No email"}</p>
                        </td>
                        <td className="px-6 py-5 text-slate-300">{patient.country || "—"}</td>
                        <td className="px-6 py-5 text-slate-300">{patient.treatment || "—"}</td>
                        <td className="px-6 py-5 text-slate-300">{patient.assigned_hospital || "Unassigned"}</td>
                        <td className="px-6 py-5 text-emerald-400 font-semibold whitespace-nowrap">
                          {formatCurrency(patient.estimated_revenue)}
                        </td>
                        <td className="px-6 py-5">
                          {patient.report_url ? (
                            <a
                              href={patient.report_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition px-4 py-2 rounded-xl text-sm font-medium"
                            >
                              View
                            </a>
                          ) : (
                            <span className="text-slate-500 text-sm">No file</span>
                          )}
                        </td>
                        <td className="px-6 py-5">
                          <StatusDropdown patientId={patient.id} currentStatus={patient.status || "New"} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MOBILE / TABLET CARDS */}
              <div className="lg:hidden divide-y divide-slate-800">
                {recentPatients.map((patient) => (
                  <div key={patient.id} className="p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/admin/patient/${patient.id}`} className="font-semibold hover:text-blue-400 transition truncate block">
                          {patient.full_name || "Unknown"}
                        </Link>
                        <p className="text-slate-500 text-sm mt-1 truncate">{patient.email || "No email"}</p>
                      </div>
                      <div className="shrink-0">
                        <StatusDropdown patientId={patient.id} currentStatus={patient.status || "New"} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                      <div>
                        <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Country</p>
                        <p className="text-slate-300 truncate">{patient.country || "—"}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Treatment</p>
                        <p className="text-slate-300 truncate">{patient.treatment || "—"}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Hospital</p>
                        <p className="text-slate-300 truncate">{patient.assigned_hospital || "Unassigned"}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Revenue</p>
                        <p className="text-emerald-400 font-semibold">{formatCurrency(patient.estimated_revenue)}</p>
                      </div>
                    </div>

                    {patient.report_url && (
                      <a
                        href={patient.report_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-4 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition px-4 py-2 rounded-xl text-sm font-medium"
                      >
                        View report
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
