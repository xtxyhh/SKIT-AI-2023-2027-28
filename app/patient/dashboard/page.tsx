"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import {
  ShieldCheck, UserCheck, Plane, FileText, CreditCard, Stethoscope,
  ChevronRight, Activity, Calendar, MapPin, AlertCircle, Phone, ArrowUpRight
} from "lucide-react";
import PatientAssignmentsOverview from "@/components/patient/PatientAssignmentsOverview";

function PatientDashboardContent() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await fetch("/api/patient/dashboard");
        if (!res.ok) {
          throw new Error("Failed to load dashboard payload");
        }
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message || "Error loading dashboard");
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 p-8 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <ShieldCheck size={48} className="text-blue-500 animate-spin" />
          <p className="font-semibold text-slate-400">Loading Patient Portal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-8 flex items-center justify-center">
        <div className="bg-red-950/40 border border-red-500/30 rounded-2xl p-6 max-w-md text-center">
          <AlertCircle size={40} className="text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold">Portal Access Error</h2>
          <p className="text-slate-400 text-sm mt-2">{error}</p>
          <Link href="/patient-login" className="mt-4 inline-block bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-xl text-xs font-semibold">
            Return to Login
          </Link>
        </div>
      </div>
    );
  }

  const patient = data?.patient || {};
  const coordinator = data?.coordinator;
  const stages = data?.journey_stages || [];
  const travel = data?.travel;
  const visa = data?.visa;
  const invoices = data?.invoices || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Top Bar */}
      <header className="border-b border-slate-850 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
            <ShieldCheck size={24} className="text-blue-400" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base">HealWithIndia</h1>
            <p className="text-[11px] text-blue-400 font-semibold tracking-wider uppercase">Patient Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/safety" className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3.5 py-1.5 rounded-full text-xs font-medium hover:bg-emerald-500/20 transition">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            Safety Hub
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 pt-8 space-y-8">
        {/* Welcome Banner */}
        <div className="relative rounded-3xl bg-gradient-to-r from-blue-900/40 via-indigo-950/40 to-slate-900 border border-slate-800 p-8 overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Welcome Back</span>
              <h2 className="text-3xl font-extrabold text-white mt-1">{patient.full_name || "Valued Patient"}</h2>
              <p className="text-slate-400 text-sm mt-2 max-w-xl">
                Medical Journey Status: <span className="text-blue-300 font-semibold">{patient.status || "Inquiry Under Review"}</span> • Destination: <span className="text-slate-200">{patient.assigned_hospital || "India (Selected Top Super-Specialty)"}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/patient/journey" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-5 py-3 rounded-xl transition flex items-center gap-2 shadow-lg shadow-blue-600/20">
                View 17-Stage Timeline
                <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Grid Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {/* Coordinator Card */}
          <div className="bg-slate-900/50 border border-slate-850 rounded-2xl p-5 hover:border-slate-750 transition">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Assigned Coordinator</span>
              <UserCheck size={18} className="text-blue-400" />
            </div>
            {coordinator ? (
              <div>
                <p className="text-white font-bold text-base">{coordinator.full_name}</p>
                <p className="text-xs text-blue-400 mt-0.5">Ref ID: {coordinator.reference_id}</p>
                <a href={`tel:${coordinator.phone}`} className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-300 bg-slate-800/60 px-3 py-1.5 rounded-lg hover:bg-slate-800">
                  <Phone size={12} className="text-emerald-400" />
                  {coordinator.phone}
                </a>
              </div>
            ) : (
              <div>
                <p className="text-slate-400 text-xs">Assigning medical coordinator...</p>
                <p className="text-[11px] text-slate-500 mt-2">Support team is matching your case.</p>
              </div>
            )}
          </div>

          {/* Visa & Travel Card */}
          <div className="bg-slate-900/50 border border-slate-850 rounded-2xl p-5 hover:border-slate-750 transition">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Visa & Flight</span>
              <Plane size={18} className="text-indigo-400" />
            </div>
            <p className="text-white font-bold text-base">{visa?.application_status || "Visa Not Applied"}</p>
            <p className="text-xs text-slate-400 mt-1">{travel?.flight_number ? `Flight: ${travel.flight_number}` : "Flight details pending"}</p>
            <Link href="/patient/travel" className="mt-3 inline-block text-xs text-indigo-400 hover:text-indigo-300 font-medium">
              Manage Travel Details →
            </Link>
          </div>

          {/* Invoices & Quotes */}
          <div className="bg-slate-900/50 border border-slate-850 rounded-2xl p-5 hover:border-slate-750 transition">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Financials</span>
              <CreditCard size={18} className="text-emerald-400" />
            </div>
            <p className="text-white font-bold text-base">{invoices.length > 0 ? `${invoices.length} Invoice(s)` : "No Active Invoice"}</p>
            <p className="text-xs text-slate-400 mt-1">{invoices[0] ? `Status: ${invoices[0].status}` : "Quote calculation in progress"}</p>
            <Link href="/patient/invoices" className="mt-3 inline-block text-xs text-emerald-400 hover:text-emerald-300 font-medium">
              View Invoices & Payments →
            </Link>
          </div>

          {/* Medical Records */}
          <div className="bg-slate-900/50 border border-slate-850 rounded-2xl p-5 hover:border-slate-750 transition">
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider">Medical Reports</span>
              <FileText size={18} className="text-cyan-400" />
            </div>
            <p className="text-white font-bold text-base">{data?.medical_reports?.length || 0} File(s) Uploaded</p>
            <p className="text-xs text-slate-400 mt-1">Review by Senior Panel</p>
            <Link href="/patient/documents" className="mt-3 inline-block text-xs text-cyan-400 hover:text-cyan-300 font-medium">
              Upload / View Reports →
            </Link>
          </div>
        </div>

        {/* Assigned Clinical & Care Network (Doctors, Care Team, Hospital Room, Treatment Plan) */}
        <PatientAssignmentsOverview 
          assignments={data?.assignments} 
          hospitalFallback={patient.assigned_hospital}
          treatmentFallback={patient.treatment}
        />

        {/* Quick Portal Navigation Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/patient/journey" className="bg-slate-900/30 border border-slate-850 rounded-xl p-4 flex items-center justify-between hover:bg-slate-900/60 transition group">
            <span className="text-sm font-semibold text-slate-200">17-Stage Journey</span>
            <ChevronRight size={18} className="text-slate-500 group-hover:translate-x-1 transition" />
          </Link>
          <Link href="/patient/travel" className="bg-slate-900/30 border border-slate-850 rounded-xl p-4 flex items-center justify-between hover:bg-slate-900/60 transition group">
            <span className="text-sm font-semibold text-slate-200">Visa & Travel</span>
            <ChevronRight size={18} className="text-slate-500 group-hover:translate-x-1 transition" />
          </Link>
          <Link href="/patient/invoices" className="bg-slate-900/30 border border-slate-850 rounded-xl p-4 flex items-center justify-between hover:bg-slate-900/60 transition group">
            <span className="text-sm font-semibold text-slate-200">Quotes & Invoices</span>
            <ChevronRight size={18} className="text-slate-500 group-hover:translate-x-1 transition" />
          </Link>
          <Link href="/safety" className="bg-slate-900/30 border border-slate-850 rounded-xl p-4 flex items-center justify-between hover:bg-slate-900/60 transition group">
            <span className="text-sm font-semibold text-slate-200">Smart Safety Hub</span>
            <ChevronRight size={18} className="text-slate-500 group-hover:translate-x-1 transition" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PatientDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white p-8 flex items-center justify-center">Loading Dashboard...</div>}>
      <PatientDashboardContent />
    </Suspense>
  );
}
