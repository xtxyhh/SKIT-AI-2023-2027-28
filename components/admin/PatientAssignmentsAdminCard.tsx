"use client";

import React, { useState, useEffect } from "react";
import {
  Stethoscope,
  Users,
  Building2,
  Activity,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  ChevronDown,
  Bed,
} from "lucide-react";
import {
  PatientCompleteAssignmentsOverview,
  DoctorAssignmentRole,
  CareTeamRole,
  HospitalRoomType,
} from "@/lib/types/patient-assignments";

interface PatientAssignmentsAdminCardProps {
  patientId: string | number;
  hospitals: Array<{ id: string; name: string }>;
}

export default function PatientAssignmentsAdminCard({
  patientId,
  hospitals,
}: PatientAssignmentsAdminCardProps) {
  const [data, setData] = useState<PatientCompleteAssignmentsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal / Form state
  const [activeModal, setActiveModal] = useState<"doctor" | "care_team" | "hospital_bed" | "treatment" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [docName, setDocName] = useState("");
  const [docRole, setDocRole] = useState<DoctorAssignmentRole>("primary_physician");
  const [docNotes, setDocNotes] = useState("");
  const [isLead, setIsLead] = useState(false);

  const [staffName, setStaffName] = useState("");
  const [staffRole, setStaffRole] = useState<CareTeamRole>("medical_interpreter");
  const [staffPhone, setStaffPhone] = useState("");
  const [languages, setLanguages] = useState("English, Arabic");

  const [selectedHospitalId, setSelectedHospitalId] = useState(hospitals[0]?.id || "");
  const [ward, setWard] = useState("International Patient Wing");
  const [roomNo, setRoomNo] = useState("");
  const [roomType, setRoomType] = useState<HospitalRoomType>("private_deluxe");

  const loadAssignments = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/admin/patient/assignments?patient_id=${patientId}`);
      if (!res.ok) {
        throw new Error("Failed to load patient assignments");
      }
      const json = await res.json();
      setData(json.data);
    } catch (err: any) {
      setError(err.message || "Failed to load assignments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      loadAssignments();
    }
  }, [patientId]);

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError("");

      // Query doctors to find or use placeholder id
      const resDocs = await fetch("/api/doctors");
      const jsonDocs = await resDocs.json();
      const firstDoc = jsonDocs.data?.[0];

      const res = await fetch("/api/admin/patient/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_type: "doctor",
          patient_id: Number(patientId),
          doctor_id: firstDoc?.id || "00000000-0000-0000-0000-000000000001",
          role: docRole,
          is_lead_doctor: isLead,
          consultation_notes: docNotes || `Assigned Dr. ${docName}`,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to assign doctor");

      setSuccess("Doctor successfully assigned to patient");
      setActiveModal(null);
      setDocName("");
      setDocNotes("");
      loadAssignments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddCareTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError("");

      const langArray = languages
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean);

      const res = await fetch("/api/admin/patient/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_type: "care_team",
          patient_id: Number(patientId),
          staff_name: staffName,
          staff_role: staffRole,
          phone: staffPhone || null,
          languages_spoken: langArray.length > 0 ? langArray : ["English"],
          is_primary_contact: true,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to assign care team member");

      setSuccess("Care team specialist assigned successfully");
      setActiveModal(null);
      setStaffName("");
      setStaffPhone("");
      loadAssignments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddHospitalBed = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError("");

      const res = await fetch("/api/admin/patient/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignment_type: "hospital_bed",
          patient_id: Number(patientId),
          hospital_id: selectedHospitalId || hospitals[0]?.id,
          ward_department: ward,
          room_number: roomNo || null,
          room_type: roomType,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to assign hospital room");

      setSuccess("Hospital room & bed assigned successfully");
      setActiveModal(null);
      loadAssignments();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAssignment = async (table: string, id: string) => {
    if (!confirm("Are you sure you want to remove this assignment?")) return;
    try {
      const res = await fetch(`/api/admin/patient/assignments?table=${table}&id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete assignment");
      setSuccess("Assignment removed");
      loadAssignments();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="bg-[#0b1329] border border-slate-800 rounded-2xl p-6 space-y-6">
      {/* Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Stethoscope size={20} className="text-blue-400" />
              Patient Relational Assignments
            </h3>
            <span className="text-xs bg-blue-500/10 text-blue-400 px-2.5 py-0.5 rounded-full border border-blue-500/20 font-medium">
              Relational Linkage
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Link this patient to verified surgeons, language interpreters, hospital beds, and surgical plans.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveModal("doctor")}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={14} />
            Assign Doctor
          </button>
          <button
            onClick={() => setActiveModal("care_team")}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={14} />
            Assign Care Team
          </button>
          <button
            onClick={() => setActiveModal("hospital_bed")}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={14} />
            Assign Bed
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle size={15} />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 size={15} />
          {success}
        </div>
      )}

      {/* Grid of Active Assignments */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Assigned Doctors */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-blue-400">
              <Stethoscope size={14} />
              Assigned Doctors ({data?.doctors.length || 0})
            </span>
          </div>

          {loading ? (
            <p className="text-slate-500 text-xs">Loading doctors...</p>
          ) : !data?.doctors.length ? (
            <p className="text-slate-500 text-xs italic">No doctors assigned yet.</p>
          ) : (
            <div className="space-y-2">
              {data.doctors.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-950 border border-slate-800/80 p-3 rounded-lg flex items-center justify-between gap-2"
                >
                  <div>
                    <p className="text-slate-200 font-semibold text-xs">
                      {item.doctor?.full_name || "Specialist Physician"}
                    </p>
                    <p className="text-[11px] text-blue-400 capitalize">
                      {item.role.replace(/_/g, " ")}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteAssignment("patient_doctor_assignments", item.id)}
                    className="text-slate-500 hover:text-red-400 transition p-1"
                    title="Remove assignment"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assigned Care Team */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-indigo-400">
              <Users size={14} />
              Care Team & Translators ({data?.care_team.length || 0})
            </span>
          </div>

          {loading ? (
            <p className="text-slate-500 text-xs">Loading team...</p>
          ) : !data?.care_team.length ? (
            <p className="text-slate-500 text-xs italic">No care team members assigned.</p>
          ) : (
            <div className="space-y-2">
              {data.care_team.map((member) => (
                <div
                  key={member.id}
                  className="bg-slate-950 border border-slate-800/80 p-3 rounded-lg flex items-center justify-between gap-2"
                >
                  <div>
                    <p className="text-slate-200 font-semibold text-xs">{member.staff_name}</p>
                    <p className="text-[11px] text-indigo-400 capitalize">
                      {member.staff_role.replace(/_/g, " ")}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteAssignment("patient_care_team_assignments", member.id)}
                    className="text-slate-500 hover:text-red-400 transition p-1"
                    title="Remove assignment"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hospital Bed Stay */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-emerald-400">
              <Building2 size={14} />
              Hospital Bed Allocation
            </span>
          </div>

          {loading ? (
            <p className="text-slate-500 text-xs">Loading allocation...</p>
          ) : !data?.hospital_stay ? (
            <p className="text-slate-500 text-xs italic">No room allocated yet.</p>
          ) : (
            <div className="bg-slate-950 border border-slate-800/80 p-3 rounded-lg space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-slate-200 font-semibold text-xs">
                  {data.hospital_stay.hospital?.name || "Partner Super-Specialty Hospital"}
                </p>
                <button
                  onClick={() => handleDeleteAssignment("patient_hospital_assignments", data.hospital_stay!.id)}
                  className="text-slate-500 hover:text-red-400 transition p-1"
                  title="Remove allocation"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <p className="text-[11px] text-emerald-400">
                {data.hospital_stay.ward_department} •{" "}
                <span className="capitalize">{data.hospital_stay.room_type.replace(/_/g, " ")}</span>
              </p>
              {data.hospital_stay.room_number && (
                <p className="text-[11px] text-slate-400">
                  Room: {data.hospital_stay.room_number}{" "}
                  {data.hospital_stay.bed_number ? `| Bed ${data.hospital_stay.bed_number}` : ""}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Assign Doctor */}
      {activeModal === "doctor" && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Stethoscope size={18} className="text-blue-400" />
              Assign Specialist Doctor
            </h4>
            <form onSubmit={handleAddDoctor} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Doctor Name</label>
                <input
                  type="text"
                  required
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="e.g. Dr. Ashok Seth"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Clinical Role</label>
                <select
                  value={docRole}
                  onChange={(e) => setDocRole(e.target.value as DoctorAssignmentRole)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="primary_physician">Primary Physician</option>
                  <option value="attending_surgeon">Attending Surgeon</option>
                  <option value="consulting_specialist">Consulting Specialist</option>
                  <option value="anesthesiologist">Anesthesiologist</option>
                  <option value="rehabilitation_specialist">Rehabilitation Specialist</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Clinical Notes / Goals</label>
                <textarea
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                  rows={2}
                  placeholder="Surgical goals, initial assessment notes..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="leadDoctor"
                  checked={isLead}
                  onChange={(e) => setIsLead(e.target.checked)}
                  className="rounded border-slate-800"
                />
                <label htmlFor="leadDoctor" className="text-xs text-slate-300">
                  Designate as Lead Supervising Doctor
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-semibold rounded-xl text-white disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Confirm Doctor Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Care Team */}
      {activeModal === "care_team" && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Users size={18} className="text-indigo-400" />
              Assign Care Team / Language Interpreter
            </h4>
            <form onSubmit={handleAddCareTeam} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Staff Member Name</label>
                <input
                  type="text"
                  required
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="e.g. Fatima Al-Mansoor"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Role</label>
                <select
                  value={staffRole}
                  onChange={(e) => setStaffRole(e.target.value as CareTeamRole)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="medical_interpreter">Medical Interpreter / Translator</option>
                  <option value="lead_nurse">Lead Nurse Coordinator</option>
                  <option value="patient_advocate">Patient Advocate</option>
                  <option value="dietitian">Clinical Dietitian</option>
                  <option value="physiotherapist">Physiotherapist</option>
                  <option value="logistics_coordinator">Logistics Liaison</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Phone / WhatsApp</label>
                <input
                  type="text"
                  value={staffPhone}
                  onChange={(e) => setStaffPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Languages Spoken (comma separated)</label>
                <input
                  type="text"
                  value={languages}
                  onChange={(e) => setLanguages(e.target.value)}
                  placeholder="Arabic, English, Hindi"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold rounded-xl text-white disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Assign Care Team Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Hospital Bed */}
      {activeModal === "hospital_bed" && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 size={18} className="text-emerald-400" />
              Assign Hospital Ward & Bed
            </h4>
            <form onSubmit={handleAddHospitalBed} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Partner Hospital</label>
                <select
                  value={selectedHospitalId}
                  onChange={(e) => setSelectedHospitalId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Ward / Wing</label>
                <input
                  type="text"
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  placeholder="International Patient Wing"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Room No.</label>
                  <input
                    type="text"
                    value={roomNo}
                    onChange={(e) => setRoomNo(e.target.value)}
                    placeholder="e.g. 504-A"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Room Type</label>
                  <select
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value as HospitalRoomType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="private_deluxe">Private Deluxe</option>
                    <option value="suite">Executive Suite</option>
                    <option value="semi_private">Semi-Private</option>
                    <option value="icu">ICU / Step-Down</option>
                    <option value="general">General</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold rounded-xl text-white disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Confirm Bed Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
