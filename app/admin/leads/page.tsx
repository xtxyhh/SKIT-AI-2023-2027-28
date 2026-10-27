"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Search,
  Phone,
  MessageCircle,
  FileText,
  Building2,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Filter,
  CircleDollarSign,
  Clock3,
  RefreshCcw,
  Plus,
  Download,
  Users,
  X,
  Copy,
  Check,
  ArrowUpDown,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { FALLBACK_PATIENTS } from "@/lib/fallback/mockDatabase";

type Patient = {
  id: number;
  created_at: string;
  full_name: string | null;
  email: string | null;
  country: string | null;
  treatment: string | null;
  description: string | null;
  status: string | null;
  report_url: string | null;
  notes: string | null;
  phone: string | null;
  assigned_hospital: string | null;
  estimated_revenue: number | null;
};

const STATUSES = [
  "All",
  "New",
  "Consultation",
  "Hospital Assigned",
  "Treatment Started",
  "Completed",
] as const;

type StatusFilter = (typeof STATUSES)[number];
type SortKey = "full_name" | "country" | "treatment" | "estimated_revenue" | "status" | "created_at";
type SortDir = "asc" | "desc";

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

const STATUS_STYLES: Record<string, { badge: string; dot: string }> = {
  Completed: { badge: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400", dot: "bg-emerald-400" },
  "Treatment Started": { badge: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400", dot: "bg-cyan-400" },
  "Hospital Assigned": { badge: "bg-blue-500/10 border-blue-500/20 text-blue-400", dot: "bg-blue-400" },
  Consultation: { badge: "bg-violet-500/10 border-violet-500/20 text-violet-400", dot: "bg-violet-400" },
};
const DEFAULT_STATUS_STYLE = { badge: "bg-amber-500/10 border-amber-500/20 text-amber-400", dot: "bg-amber-400" };

function getStatusStyle(status: string | null) {
  return STATUS_STYLES[status ?? ""] ?? DEFAULT_STATUS_STYLE;
}
function formatCurrency(value: number | null | undefined) {
  return `$${(value ?? 0).toLocaleString()}`;
}
function initialFor(name: string | null) {
  const trimmed = name?.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "P";
}
function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** Debounce a fast-changing value so filtering doesn't run on every keystroke. */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export default function LeadsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 200);

  const [status, setStatus] = useState<StatusFilter>("All");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fetchPatients = useCallback(async (isInitial: boolean) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setPatients(FALLBACK_PATIENTS);
    } else if (data && data.length > 0) {
      setPatients(data);
    } else {
      setPatients(FALLBACK_PATIENTS);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPatients(true);
  }, [fetchPatients]);

  // Copy-to-clipboard toast auto-clear.
  useEffect(() => {
    if (!copiedField) return;
    const t = setTimeout(() => setCopiedField(null), 1500);
    return () => clearTimeout(t);
  }, [copiedField]);

  const filteredPatients = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = patients.filter((patient) => {
      const matchesSearch =
        query === "" ||
        patient.full_name?.toLowerCase().includes(query) ||
        patient.country?.toLowerCase().includes(query) ||
        patient.treatment?.toLowerCase().includes(query) ||
        patient.email?.toLowerCase().includes(query);

      const matchesStatus = status === "All" || patient.status === status;
      return matchesSearch && matchesStatus;
    });

    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "full_name":
          cmp = (a.full_name ?? "").localeCompare(b.full_name ?? "");
          break;
        case "country":
          cmp = (a.country ?? "").localeCompare(b.country ?? "");
          break;
        case "treatment":
          cmp = (a.treatment ?? "").localeCompare(b.treatment ?? "");
          break;
        case "estimated_revenue":
          cmp = (a.estimated_revenue ?? 0) - (b.estimated_revenue ?? 0);
          break;
        case "status":
          cmp = (a.status ?? "").localeCompare(b.status ?? "");
          break;
        case "created_at":
        default:
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return sorted;
  }, [patients, search, status, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedPatients = useMemo(
    () => filteredPatients.slice(startIndex, startIndex + pageSize),
    [filteredPatients, startIndex, pageSize]
  );

  const stats = useMemo(() => {
    const activeCases = patients.filter((p) => p.status !== "Completed").length;
    const revenue = patients.reduce((acc, p) => acc + (p.estimated_revenue ?? 0), 0);
    const hospitals = new Set(patients.map((p) => p.assigned_hospital).filter(Boolean)).size;
    return { total: patients.length, activeCases, revenue, hospitals };
  }, [patients]);

  const allVisibleSelected = paginatedPatients.length > 0 && paginatedPatients.every((p) => selectedIds.has(p.id));

  function toggleSelectAllVisible() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        paginatedPatients.forEach((p) => next.delete(p.id));
      } else {
        paginatedPatients.forEach((p) => next.add(p.id));
      }
      return next;
    });
  }

  function toggleSelectOne(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function handleStatusChange(value: StatusFilter) {
    setStatus(value);
    setCurrentPage(1);
  }

  function exportRows(rows: Patient[], filenameSuffix: string) {
    const headers = [
      "ID",
      "Full Name",
      "Email",
      "Country",
      "Treatment",
      "Status",
      "Phone",
      "Assigned Hospital",
      "Estimated Revenue",
    ];
    const dataRows = rows.map((p) => [
      p.id,
      p.full_name ?? "",
      p.email ?? "",
      p.country ?? "",
      p.treatment ?? "",
      p.status ?? "",
      p.phone ?? "",
      p.assigned_hospital ?? "",
      p.estimated_revenue ?? 0,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...dataRows]
        .map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))
        .join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `leads_${filenameSuffix}_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleCopy(value: string, field: string) {
    navigator.clipboard?.writeText(value).then(() => setCopiedField(field));
  }

  const selectedCount = selectedIds.size;

  return (
    <div className="min-h-screen bg-[#020817] text-white px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
      <div className="mx-auto max-w-[1600px]">
        {/* HEADER */}
        <div className="flex flex-col xl:flex-row justify-between gap-8">
          <div>
            <p className="uppercase tracking-[4px] sm:tracking-[5px] text-blue-400 text-xs sm:text-sm font-semibold">
              HealWithIndia CRM
            </p>
            <h1 className="text-[34px] sm:text-[48px] lg:text-[60px] font-bold leading-[1.05] lg:leading-[0.95] mt-4">
              Patient
              <span className="block bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Leads
              </span>
            </h1>
            <p className="text-slate-400 text-base sm:text-lg mt-5 sm:mt-6 max-w-2xl">
              Manage international patients, assign hospitals, track treatment progress and
              communicate instantly.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 sm:gap-4 items-start">
            <button
              onClick={() => fetchPatients(false)}
              disabled={refreshing || loading}
              className="flex items-center gap-2.5 px-5 sm:px-6 py-3.5 sm:py-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed transition text-sm sm:text-base font-medium"
            >
              <RefreshCcw size={18} className={refreshing ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => exportRows(filteredPatients, "export")}
              disabled={filteredPatients.length === 0}
              className="flex items-center gap-2.5 px-5 sm:px-6 py-3.5 sm:py-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition text-sm sm:text-base font-semibold"
            >
              <Download size={18} />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">Export</span>
            </button>

            <button className="flex items-center gap-2.5 px-5 sm:px-7 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 font-semibold hover:scale-[1.03] active:scale-[0.98] transition-all text-sm sm:text-base shadow-lg shadow-blue-600/20">
              <Plus size={18} />
              New Lead
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300 px-6 py-4 flex items-center justify-between gap-4">
            <span className="text-sm sm:text-base">{errorMsg}</span>
            <button
              onClick={() => fetchPatients(true)}
              className="text-sm font-semibold underline underline-offset-2 shrink-0 hover:text-red-200"
            >
              Retry
            </button>
          </div>
        )}

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 sm:gap-7 mt-10 sm:mt-14">
          <StatCard
            label="Total Leads"
            value={loading ? null : stats.total.toLocaleString()}
            footer="Growing"
            footerColor="text-emerald-400"
            icon={<ChevronRight size={18} />}
          />
          <StatCard
            label="Revenue"
            value={loading ? null : formatCurrency(stats.revenue)}
            footer="Estimated"
            footerColor="text-amber-400"
            icon={<CircleDollarSign size={18} />}
          />
          <StatCard
            label="Active Cases"
            value={loading ? null : stats.activeCases.toLocaleString()}
            footer="In Progress"
            footerColor="text-cyan-400"
            icon={<Clock3 size={18} />}
          />
          <StatCard
            label="Hospitals"
            value={loading ? null : stats.hospitals.toLocaleString()}
            footer="Connected"
            footerColor="text-blue-400"
            icon={<Building2 size={18} />}
          />
        </div>

        {/* TOOLBAR */}
        <div className="mt-10 sm:mt-14 rounded-3xl border border-slate-800 bg-slate-900/50 backdrop-blur-3xl p-5 sm:p-6">
          <div className="flex flex-col xl:flex-row gap-5 sm:gap-6 justify-between">
            <div className="relative flex-1 min-w-0">
              <Search size={20} className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search patients, country, treatment or email..."
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 sm:pl-14 pr-11 py-4 sm:py-5 text-white placeholder:text-slate-500 outline-none focus:border-blue-500 transition-all text-sm sm:text-base"
              />
              {searchInput && (
                <button
                  onClick={() => {
                    setSearchInput("");
                    setCurrentPage(1);
                  }}
                  aria-label="Clear search"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            <div className="flex gap-2.5 sm:gap-3 flex-wrap items-center xl:justify-end">
              <div className="flex items-center gap-2.5 px-4 sm:px-5 py-3.5 sm:py-4 rounded-2xl bg-slate-950 border border-slate-800 text-sm sm:text-base shrink-0">
                <Filter size={18} className="text-blue-400" />
                <span className="hidden sm:inline">Status</span>
              </div>
              {STATUSES.map((item) => (
                <button
                  key={item}
                  onClick={() => handleStatusChange(item)}
                  className={`px-4 sm:px-5 py-3.5 sm:py-4 rounded-2xl border transition-all text-xs sm:text-sm font-medium whitespace-nowrap ${
                    status === item
                      ? "bg-blue-600 border-blue-500 text-white"
                      : "bg-slate-950 border-slate-800 text-slate-300 hover:border-blue-500"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* LEADS */}
        <div className="mt-10 sm:mt-14 rounded-[28px] sm:rounded-[38px] border border-slate-800 bg-slate-900/50 backdrop-blur-3xl overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 sm:px-8 py-6 sm:py-7 border-b border-slate-800">
            <div className="min-w-0">
              <h2 className="text-xl sm:text-3xl font-bold">Patient Leads</h2>
              <p className="text-slate-400 mt-1.5 sm:mt-2 text-sm sm:text-base">
                {loading
                  ? "Loading…"
                  : `${filteredPatients.length} patient${filteredPatients.length === 1 ? "" : "s"} found`}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {selectedCount > 0 && (
                <div className="flex items-center gap-2 pr-3 border-r border-slate-800">
                  <span className="text-sm text-slate-300 font-medium whitespace-nowrap">
                    {selectedCount} selected
                  </span>
                  <button
                    onClick={() => {
                      exportRows(
                        filteredPatients.filter((p) => selectedIds.has(p.id)),
                        "selection"
                      );
                    }}
                    className="text-sm px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition font-medium"
                  >
                    Export
                  </button>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="text-sm px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition font-medium"
                  >
                    Clear
                  </button>
                </div>
              )}
              <Link
                href="/admin/patients"
                className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition text-sm sm:text-base font-medium shrink-0"
              >
                View All
              </Link>
            </div>
          </div>

          {loading && <SkeletonRows />}

          {!loading && filteredPatients.length === 0 && (
            <div className="text-center py-20 sm:py-24 px-6">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-slate-800/60 flex items-center justify-center mb-6">
                <Users size={28} className="text-slate-500" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold">No patients found</h3>
              <p className="text-slate-400 mt-3 max-w-sm mx-auto">
                Try a different search, change your status filter, or add a new lead to get started.
              </p>
              {(searchInput || status !== "All") && (
                <button
                  onClick={() => {
                    setSearchInput("");
                    setStatus("All");
                    setCurrentPage(1);
                  }}
                  className="mt-5 text-sm font-semibold text-blue-400 hover:text-blue-300 transition"
                >
                  Clear search & filters
                </button>
              )}
            </div>
          )}

          {/* DESKTOP TABLE */}
          {!loading && filteredPatients.length > 0 && (
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full min-w-[1150px]">
                <thead className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur">
                  <tr className="border-b border-slate-800 text-left text-slate-500 text-sm">
                    <th className="pl-8 py-5 w-12">
                      <Checkbox checked={allVisibleSelected} onChange={toggleSelectAllVisible} label="Select all visible rows" />
                    </th>
                    <SortableHeader label="Patient" sortKey="full_name" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortableHeader label="Country" sortKey="country" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortableHeader label="Treatment" sortKey="treatment" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
                    <th className="py-5 font-medium">Hospital</th>
                    <SortableHeader label="Revenue" sortKey="estimated_revenue" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortableHeader label="Status" sortKey="status" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortableHeader label="Added" sortKey="created_at" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
                    <th className="py-5 font-medium text-right pr-8">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPatients.map((patient) => {
                    const statusStyle = getStatusStyle(patient.status);
                    const isSelected = selectedIds.has(patient.id);
                    return (
                      <tr
                        key={patient.id}
                        className={`border-b border-slate-800/60 last:border-b-0 transition-colors duration-150 ${
                          isSelected ? "bg-blue-500/[0.06]" : "hover:bg-slate-950/60"
                        }`}
                      >
                        <td className="pl-8 py-5">
                          <Checkbox
                            checked={isSelected}
                            onChange={() => toggleSelectOne(patient.id)}
                            label={`Select ${patient.full_name ?? "patient"}`}
                          />
                        </td>

                        <td className="py-5 pr-4 max-w-[240px]">
                          <div className="flex items-center gap-3.5">
                            <div className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center font-bold text-sm">
                              {initialFor(patient.full_name)}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-semibold truncate text-[15px]">{patient.full_name || "Unknown"}</h3>
                              <button
                                onClick={() => patient.email && handleCopy(patient.email, `email-${patient.id}`)}
                                disabled={!patient.email}
                                className="text-slate-400 text-sm mt-0.5 truncate flex items-center gap-1.5 hover:text-blue-400 transition disabled:hover:text-slate-400 disabled:cursor-default group"
                              >
                                <span className="truncate">{patient.email || "No email"}</span>
                                {patient.email &&
                                  (copiedField === `email-${patient.id}` ? (
                                    <Check size={12} className="shrink-0 text-emerald-400" />
                                  ) : (
                                    <Copy size={12} className="shrink-0 opacity-0 group-hover:opacity-100 transition" />
                                  ))}
                              </button>
                            </div>
                          </div>
                        </td>

                        <td className="py-5 pr-4">
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950 border border-slate-800 text-sm whitespace-nowrap">
                            <span aria-hidden="true">🌍</span>
                            {patient.country || "—"}
                          </div>
                        </td>

                        <td className="py-5 pr-4 max-w-[190px]">
                          <h4 className="font-medium truncate text-[15px]">{patient.treatment || "—"}</h4>
                          {patient.description && (
                            <p className="text-sm text-slate-500 mt-0.5 truncate">{patient.description}</p>
                          )}
                        </td>

                        <td className="py-5 pr-4 max-w-[170px]">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm">
                            <Building2 size={14} className="text-blue-400 shrink-0" />
                            <span className="truncate">{patient.assigned_hospital || "Not assigned"}</span>
                          </div>
                        </td>

                        <td className="py-5 pr-4">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold text-sm whitespace-nowrap">
                            <CircleDollarSign size={14} />
                            {formatCurrency(patient.estimated_revenue)}
                          </div>
                        </td>

                        <td className="py-5 pr-4">
                          <div
                            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full font-medium border text-sm whitespace-nowrap ${statusStyle.badge}`}
                          >
                            <div className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                            {patient.status || "New"}
                          </div>
                        </td>

                        <td className="py-5 pr-4 text-sm text-slate-500 whitespace-nowrap">
                          {relativeTime(patient.created_at)}
                        </td>

                        <td className="py-5 pr-8">
                          <div className="flex items-center justify-end gap-1.5">
                            <ActionButton
                              href={patient.phone ? `tel:${patient.phone}` : undefined}
                              disabled={!patient.phone}
                              icon={<Phone size={16} className="text-blue-400" />}
                              label="Call patient"
                            />
                            <ActionButton
                              href={patient.phone ? `https://wa.me/${patient.phone.replace(/[^\d]/g, "")}` : undefined}
                              disabled={!patient.phone}
                              external
                              icon={<MessageCircle size={16} className="text-emerald-400" />}
                              label="Message on WhatsApp"
                              tint="emerald"
                            />
                            <ActionButton
                              href={patient.report_url ?? undefined}
                              disabled={!patient.report_url}
                              external
                              icon={<FileText size={16} className="text-cyan-400" />}
                              label="View report"
                              tint="cyan"
                            />
                            <Link
                              href={`/admin/patient/${patient.id}`}
                              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 transition font-medium text-sm whitespace-nowrap"
                            >
                              View
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* MOBILE CARDS */}
          {!loading && filteredPatients.length > 0 && (
            <div className="lg:hidden divide-y divide-slate-800/60">
              {paginatedPatients.map((patient) => {
                const statusStyle = getStatusStyle(patient.status);
                const isSelected = selectedIds.has(patient.id);
                return (
                  <div key={patient.id} className={`p-5 sm:p-6 ${isSelected ? "bg-blue-500/[0.06]" : ""}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => toggleSelectOne(patient.id)}
                          label={`Select ${patient.full_name ?? "patient"}`}
                        />
                        <div className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center font-bold text-sm">
                          {initialFor(patient.full_name)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold truncate">{patient.full_name || "Unknown"}</h3>
                          <p className="text-slate-400 text-sm truncate">{patient.email || "No email"}</p>
                        </div>
                      </div>

                      <div
                        className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium border text-xs whitespace-nowrap ${statusStyle.badge}`}
                      >
                        <div className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                        {patient.status || "New"}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                      <div>
                        <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Country</p>
                        <p className="truncate">{patient.country || "—"}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Treatment</p>
                        <p className="truncate">{patient.treatment || "—"}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Hospital</p>
                        <p className="truncate">{patient.assigned_hospital || "Not assigned"}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Revenue</p>
                        <p className="text-emerald-400 font-semibold">{formatCurrency(patient.estimated_revenue)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 mt-5">
                      <ActionButton
                        href={patient.phone ? `tel:${patient.phone}` : undefined}
                        disabled={!patient.phone}
                        icon={<Phone size={17} className="text-blue-400" />}
                        label="Call patient"
                      />
                      <ActionButton
                        href={patient.phone ? `https://wa.me/${patient.phone.replace(/[^\d]/g, "")}` : undefined}
                        disabled={!patient.phone}
                        external
                        icon={<MessageCircle size={17} className="text-emerald-400" />}
                        label="Message on WhatsApp"
                        tint="emerald"
                      />
                      <ActionButton
                        href={patient.report_url ?? undefined}
                        disabled={!patient.report_url}
                        external
                        icon={<FileText size={17} className="text-cyan-400" />}
                        label="View report"
                        tint="cyan"
                      />
                      <Link
                        href={`/admin/patient/${patient.id}`}
                        className="flex-1 text-center px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 transition font-medium text-sm"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* FOOTER: page size + pagination */}
          {!loading && filteredPatients.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 sm:px-8 py-5 bg-slate-950/40 border-t border-slate-800">
              <div className="flex items-center gap-2.5 text-sm text-slate-400">
                <span className="hidden sm:inline">Rows per page</span>
                <div className="flex gap-1.5">
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <button
                      key={size}
                      onClick={() => {
                        setPageSize(size);
                        setCurrentPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        pageSize === size ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition text-sm font-semibold"
                  >
                    Previous
                  </button>
                  <span className="text-slate-400 text-xs sm:text-sm font-medium whitespace-nowrap">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition text-sm font-semibold"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  footer,
  footerColor,
  icon,
}: {
  label: string;
  value: string | null;
  footer: string;
  footerColor: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/50 backdrop-blur-3xl p-6 sm:p-8 hover:border-slate-700 transition-colors">
      <p className="text-slate-400 text-sm sm:text-base">{label}</p>
      {value === null ? (
        <div className="h-10 sm:h-12 w-24 mt-4 sm:mt-5 rounded-lg bg-slate-800/60 animate-pulse" />
      ) : (
        <h2 className="text-3xl sm:text-5xl font-bold mt-4 sm:mt-5 truncate">{value}</h2>
      )}
      <div className={`mt-4 sm:mt-5 inline-flex items-center gap-2 text-sm ${footerColor}`}>
        {icon}
        {footer}
      </div>
    </div>
  );
}

function ActionButton({
  href,
  disabled,
  external,
  icon,
  label,
  tint = "blue",
}: {
  href?: string;
  disabled?: boolean;
  external?: boolean;
  icon: React.ReactNode;
  label: string;
  tint?: "blue" | "emerald" | "cyan";
}) {
  const tintClasses =
    tint === "emerald"
      ? "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20"
      : tint === "cyan"
      ? "bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/20"
      : "bg-slate-950 border-slate-800 hover:border-blue-500";

  const baseClasses = `h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-xl border flex items-center justify-center transition ${tintClasses}`;

  if (disabled || !href) {
    return (
      <span aria-disabled="true" title={`${label} unavailable`} className={`${baseClasses} opacity-30 cursor-not-allowed`}>
        {icon}
      </span>
    );
  }

  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      title={label}
      aria-label={label}
      className={baseClasses}
    >
      {icon}
    </a>
  );
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`h-5 w-5 shrink-0 rounded-md border flex items-center justify-center transition ${
        checked ? "bg-blue-600 border-blue-500" : "bg-slate-950 border-slate-700 hover:border-slate-500"
      }`}
    >
      {checked && <Check size={13} className="text-white" strokeWidth={3} />}
    </button>
  );
}

function SortableHeader({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const isActive = activeKey === sortKey;
  return (
    <th className="py-5 font-medium select-none">
      <button
        onClick={() => onSort(sortKey)}
        className={`flex items-center gap-1.5 transition ${isActive ? "text-slate-200" : "text-slate-500 hover:text-slate-300"}`}
      >
        {label}
        {isActive ? (
          dir === "asc" ? (
            <ChevronUp size={14} />
          ) : (
            <ChevronDown size={14} />
          )
        ) : (
          <ArrowUpDown size={12} className="opacity-40" />
        )}
      </button>
    </th>
  );
}

function SkeletonRows() {
  return (
    <div className="divide-y divide-slate-800/60">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 sm:px-8 py-5 animate-pulse">
          <div className="h-11 w-11 rounded-full bg-slate-800/60 shrink-0" />
          <div className="flex-1 space-y-2 min-w-0">
            <div className="h-3.5 w-1/3 max-w-[160px] rounded bg-slate-800/60" />
            <div className="h-3 w-1/4 max-w-[120px] rounded bg-slate-800/40" />
          </div>
          <div className="hidden sm:block h-7 w-20 rounded-full bg-slate-800/40" />
          <div className="hidden md:block h-7 w-24 rounded-xl bg-slate-800/40" />
        </div>
      ))}
    </div>
  );
}