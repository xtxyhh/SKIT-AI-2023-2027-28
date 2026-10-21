"use client";

import React, { useState } from "react";
import {
  Stethoscope,
  Users,
  Building2,
  Calendar,
  Languages,
  Clock,
  ShieldCheck,
  CheckCircle2,
  FileCheck,
  ChevronRight,
  User,
  HeartHandshake,
  Activity,
  Bed,
  MapPin,
  Sparkles,
} from "lucide-react";
import { PatientCompleteAssignmentsOverview } from "@/lib/types/patient-assignments";

interface PatientAssignmentsOverviewProps {
  assignments?: PatientCompleteAssignmentsOverview | null;
  hospitalFallback?: string | null;
  treatmentFallback?: string | null;
}

export default function PatientAssignmentsOverview({
  assignments,
  hospitalFallback,
  treatmentFallback,
}: PatientAssignmentsOverviewProps) {
  const [activeTab, setActiveTab] = useState<"doctors" | "care_team" | "hospital" | "treatment">("doctors");

  const doctors = assignments?.doctors || [];
  const careTeam = assignments?.care_team || [];
  const hospitalStay = assignments?.hospital_stay;
  const treatments = assignments?.treatments || [];
  const leadDoctor = assignments?.active_lead_doctor;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Stethoscope size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-white">Assigned Clinical & Care Network</h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 size={12} />
                Verified Network
              </span>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
              Accredited doctors, personal translators, hospital departments, and scheduled care plans.
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center bg-slate-950 p-1.5 rounded-2xl border border-slate-800 self-start sm:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab("doctors")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "doctors"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Stethoscope size={14} />
            Doctors ({doctors.length})
          </button>
          <button
            onClick={() => setActiveTab("care_team")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "care_team"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users size={14} />
            Care Team ({careTeam.length})
          </button>
          <button
            onClick={() => setActiveTab("hospital")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "hospital"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Building2 size={14} />
            Hospital & Room
          </button>
          <button
            onClick={() => setActiveTab("treatment")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === "treatment"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Activity size={14} />
            Treatment Plan ({treatments.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Assigned Doctors */}
      {activeTab === "doctors" && (
        <div className="space-y-4">
          {doctors.length === 0 ? (
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 text-center">
              <Stethoscope size={36} className="text-slate-600 mx-auto mb-2" />
              <h4 className="text-slate-200 font-semibold text-sm">Doctor Assignment In Progress</h4>
              <p className="text-slate-400 text-xs mt-1 max-w-md mx-auto">
                Our medical board is reviewing your diagnostic reports to assign the senior lead surgeon
                best suited for your procedure in India.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {doctors.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-5 hover:border-slate-700 transition space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-lg shadow-md shadow-blue-600/20">
                          {item.doctor?.full_name?.charAt(0) || "D"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-white font-bold text-sm">
                              {item.doctor?.full_name || "Assigned Specialist"}
                            </h4>
                            {item.is_lead_doctor && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                Lead Doctor
                              </span>
                            )}
                          </div>
                          <p className="text-blue-400 text-xs font-medium">
                            {item.doctor?.specialty || "Medical Specialist"}
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider bg-slate-900 border border-slate-800 text-slate-300">
                        {item.role.replace(/_/g, " ")}
                      </span>
                    </div>

                    {item.doctor?.qualification && (
                      <p className="text-slate-400 text-xs leading-relaxed">
                        <span className="text-slate-500 font-medium">Qualifications:</span>{" "}
                        {item.doctor.qualification}
                      </p>
                    )}

                    {item.consultation_notes && (
                      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs text-slate-300">
                        <p className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider mb-1">
                          Doctor Review Notes
                        </p>
                        {item.consultation_notes}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-blue-400" />
                      <span>
                        {item.consultation_date
                          ? `Consult: ${new Date(item.consultation_date).toLocaleDateString()}`
                          : "Consultation Pending"}
                      </span>
                    </div>
                    <span className="text-emerald-400 font-medium text-[11px] flex items-center gap-1">
                      <ShieldCheck size={13} />
                      Verified Specialist
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Multidisciplinary Care Team */}
      {activeTab === "care_team" && (
        <div className="space-y-4">
          {careTeam.length === 0 ? (
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 text-center">
              <Users size={36} className="text-slate-600 mx-auto mb-2" />
              <h4 className="text-slate-200 font-semibold text-sm">Care Team Allocation</h4>
              <p className="text-slate-400 text-xs mt-1 max-w-md mx-auto">
                Your dedicated bilingual medical translator and lead care coordinator are assigned 48
                hours prior to your arrival in India.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {careTeam.map((member) => (
                <div
                  key={member.id}
                  className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-5 hover:border-slate-700 transition space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-white font-bold text-sm">{member.staff_name}</h4>
                      <p className="text-blue-400 text-xs capitalize font-medium">
                        {member.staff_role.replace(/_/g, " ")}
                      </p>
                    </div>
                    {member.is_primary_contact && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                        Primary Contact
                      </span>
                    )}
                  </div>

                  {member.languages_spoken && member.languages_spoken.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Languages size={13} className="text-slate-500 shrink-0" />
                      {member.languages_spoken.map((lang, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded-md text-[10px] text-slate-300 font-medium"
                        >
                          {lang}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-800/70 flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock size={12} className="text-slate-500" />
                      Shift: <span className="capitalize text-slate-300">{member.shift}</span>
                    </span>
                    {member.phone && (
                      <span className="text-slate-300 font-mono text-[11px]">{member.phone}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Hospital & Room Admission Details */}
      {activeTab === "hospital" && (
        <div className="space-y-4">
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                  Designated Partner Facility
                </span>
                <h4 className="text-xl font-bold text-white mt-1">
                  {hospitalStay?.hospital?.name || hospitalFallback || "Apollo Super Speciality Hospital, New Delhi"}
                </h4>
                <p className="text-slate-400 text-xs flex items-center gap-1.5 mt-1">
                  <MapPin size={13} className="text-red-400" />
                  {hospitalStay?.hospital?.city || "New Delhi, India"} •{" "}
                  {hospitalStay?.hospital?.accreditation || "JCI & NABH Accredited Super-Specialty"}
                </p>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl text-xs font-semibold self-start md:self-auto">
                <Bed size={15} />
                Status:{" "}
                <span className="capitalize">
                  {hospitalStay?.status?.replace(/_/g, " ") || "Bed Reserved"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-xl">
                <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Ward / Wing</p>
                <p className="text-slate-200 font-bold text-sm mt-0.5">
                  {hospitalStay?.ward_department || "International Lounge & Wing"}
                </p>
              </div>
              <div className="bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-xl">
                <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Room Type</p>
                <p className="text-slate-200 font-bold text-sm mt-0.5 capitalize">
                  {hospitalStay?.room_type?.replace(/_/g, " ") || "Private Deluxe Suite"}
                </p>
              </div>
              <div className="bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-xl">
                <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Room & Bed No.</p>
                <p className="text-slate-200 font-bold text-sm mt-0.5">
                  {hospitalStay?.room_number ? `Room ${hospitalStay.room_number}` : "Room Assigned on Check-in"}
                  {hospitalStay?.bed_number ? ` (Bed ${hospitalStay.bed_number})` : ""}
                </p>
              </div>
              <div className="bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-xl">
                <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Admission Target</p>
                <p className="text-slate-200 font-bold text-sm mt-0.5">
                  {hospitalStay?.admission_date
                    ? new Date(hospitalStay.admission_date).toLocaleDateString()
                    : "Scheduled upon arrival"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Assigned Treatment Plan */}
      {activeTab === "treatment" && (
        <div className="space-y-4">
          {treatments.length === 0 ? (
            <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-6">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                    Primary Scheduled Procedure
                  </span>
                  <h4 className="text-lg font-bold text-white mt-1">
                    {treatmentFallback || "Super-Specialty Medical Consultation & Procedure"}
                  </h4>
                  <p className="text-slate-400 text-xs mt-1">
                    Detailed surgical plan, pre-op laboratory checks, and inpatient schedule.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Pre-Approved
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {treatments.map((plan) => (
                <div
                  key={plan.id}
                  className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-5 hover:border-slate-700 transition space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/70 pb-3">
                    <div>
                      <h4 className="text-white font-bold text-base">
                        {plan.treatment?.name || "Specialized Treatment"}
                      </h4>
                      <p className="text-blue-400 text-xs font-medium">
                        Category: {plan.treatment?.category || "Multi-Disciplinary Surgery"}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 self-start sm:self-auto">
                      Stage: {plan.stage.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/70">
                      <p className="text-slate-500 font-semibold text-[10px] uppercase">Supervising Surgeon</p>
                      <p className="text-slate-200 font-bold mt-0.5">
                        {plan.supervising_doctor?.full_name || leadDoctor?.doctor?.full_name || "Assigned on Arrival"}
                      </p>
                    </div>
                    <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/70">
                      <p className="text-slate-500 font-semibold text-[10px] uppercase">Procedure Target Date</p>
                      <p className="text-slate-200 font-bold mt-0.5">
                        {plan.scheduled_date
                          ? new Date(plan.scheduled_date).toLocaleDateString()
                          : "Scheduled Post-Admission"}
                      </p>
                    </div>
                    <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800/70">
                      <p className="text-slate-500 font-semibold text-[10px] uppercase">Est. Hospital Recovery</p>
                      <p className="text-slate-200 font-bold mt-0.5">
                        {plan.estimated_duration_days || 7} Days
                      </p>
                    </div>
                  </div>

                  {plan.pre_op_requirements && (
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/70 text-xs text-slate-300">
                      <span className="font-semibold text-slate-400 block mb-1">Pre-Operative Guidelines:</span>
                      {plan.pre_op_requirements}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
