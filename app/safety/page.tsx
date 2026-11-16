"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ProtectionStatus from "@/components/ProtectionStatus";
import SafetyRecommendationBanner from "@/components/SafetyRecommendationBanner";
import AccountMenu from "@/components/AccountMenu";
import TrustVerificationBar from "@/components/TrustVerificationBar";
import {
  ShieldCheck,
  UserRoundCheck,
  MapPin,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Phone,
  Clock,
  FileText,
  ArrowRight,
  ShieldAlert,
  Activity,
  Plane,
  Hotel,
  Stethoscope,
  Upload,
  Trash2,
  AlertCircle,
  Heart,
  Plus,
  LifeBuoy,
  Building,
  UserCheck,
  Navigation,
  FileCheck
} from "lucide-react";
import {
  mapCheckInToTimeline,
  mapCaseToTimeline,
  mapChecklistToTimeline,
  mapCoordinatorToTimeline,
  sortTimelineByTimestamp,
  getTimelineStatusColorClasses,
} from "@/lib/safety/protection-timeline";

interface SafetyProfile {
  journey_stage: string;
  coordinator_assignment_id: string | null;
  treatment_destination: string | null;
  hospital_name: string | null;
  estimated_arrival_date: string | null;
  patient?: {
    full_name: string;
    email: string;
    phone: string;
    country: string;
    treatment: string;
  };
  extra?: {
    notes_text?: string;
    estimated_cost?: number;
    paid_amount?: number;
    currency?: string;
    invoice_status?: string;
    flight_number?: string;
    flight_departure_time?: string;
    hotel_name?: string;
    hotel_address?: string;
    hotel_booking_reference?: string;
    doctor_name?: string;
    treatment_plan_summary?: string;
    allergies?: string;
    blood_group?: string;
    emergency_contacts?: string;
    medical_history?: string;
    documents?: Array<{
      type: string;
      name: string;
      url: string;
      uploaded_at: string;
    }>;
  };
}

interface CoordinatorVerification {
  coordinator_id: string;
  reference_id: string;
  full_name: string;
  phone: string;
  is_verified: boolean;
  is_active: boolean;
}

interface CheckIn {
  id: string;
  check_in_type: string;
  status: string;
  notes: string | null;
  created_at: string;
}

interface ChecklistItem {
  item_type: string;
  is_completed: boolean;
  completed_at: string | null;
}

interface RiskData {
  risk_level: string;
  patient_safe_status: string;
  explanation: string;
  recommended_actions: string[];
  evaluated_at: string;
}

interface ProtectionStatusData {
  protectionStatus: any;
  latestCheckIn: any;
  checklistProgress: any;
  coordinatorStatus: any;
  activeAssistance: any;
  recommendation: any;
}

interface SafetyCase {
  id: string;
  category: string;
  priority: string;
  status: string;
  description: string;
  created_at: string;
}

function SafetyHubContent() {
  const [activeTab, setActiveTab] = useState<"safety" | "travel" | "medical" | "documents" | "support">("safety");
  
  const [loading, setLoading] = useState(true);
  const [safetyProfile, setSafetyProfile] = useState<SafetyProfile | null>(null);
  const [coordinatorVerification, setCoordinatorVerification] = useState<CoordinatorVerification | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [riskData, setRiskData] = useState<RiskData | null>(null);
  const [protectionStatusData, setProtectionStatusData] = useState<ProtectionStatusData | null>(null);
  const [safetyCases, setSafetyCases] = useState<SafetyCase[]>([]);
  const searchParams = useSearchParams();
  
  const [error, setError] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState<string | null>(null);
  
  // Emergency SOS states
  const [sosConfirming, setSosConfirming] = useState(false);
  const [sosTriggered, setSosTriggered] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);

  const loadSafetyData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Please log in to access your safety hub");
        setLoading(false);
        return;
      }

      // Load profile, coordinator, check-ins, risk and protection status concurrently
      const [
        profileRes,
        coordinatorRes,
        checkInsRes,
        riskRes,
        protectionRes,
        casesRes
      ] = await Promise.all([
        fetch(`/api/safety/profile`),
        fetch(`/api/safety/coordinator`),
        fetch(`/api/safety/check-ins`),
        fetch(`/api/safety/risk`),
        fetch(`/api/safety/protection-status`),
        fetch(`/api/safety/cases`)
      ]);

      let hasProfile = false;

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        if (profileData) {
          setSafetyProfile(profileData.data);
          hasProfile = !!profileData.data;
          
          if (profileData.protection_status === 'NOT_ACTIVATED') {
            setChecklist([]);
            hasProfile = false;
          }
        }
      } else {
        const errorData = await profileRes.json();
        if (errorData.protection_status === 'NOT_ACTIVATED') {
          setSafetyProfile(null);
          setChecklist([]);
        }
      }

      if (coordinatorRes.ok) {
        const { data: coordinatorData } = await coordinatorRes.json();
        setCoordinatorVerification(coordinatorData);
      }

      if (checkInsRes.ok) {
        const { data: checkInsData } = await checkInsRes.json();
        setCheckIns(checkInsData || []);
      }

      if (riskRes.ok) {
        const riskData = await riskRes.json();
        setRiskData(riskData);
      }

      if (protectionRes.ok) {
        const protectionData = await protectionRes.json();
        setProtectionStatusData(protectionData);
      }

      if (casesRes.ok) {
        const { data: casesData } = await casesRes.json();
        const casesArray = casesData || [];
        setSafetyCases(casesArray);
        setSosTriggered(
          casesArray.some(
            (caseItem: SafetyCase) =>
              caseItem.priority === "critical" &&
              ["open", "acknowledged", "in_progress"].includes(caseItem.status)
          )
        );
      }

      // Fetch checklist concurrently if active safety profile is verified
      if (hasProfile) {
        const checklistResponse = await fetch(`/api/safety/checklist`);
        if (checklistResponse.ok) {
          const { data: checklistData } = await checklistResponse.json();
          setChecklist(checklistData || []);
        }
      }

    } catch (err: any) {
      console.error("Error loading safety data:", err);
      setError("Unable to load safety information. Please contact support.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSafetyData();
  }, []);

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      initial: "Initial Consultation",
      visa_processing: "Visa Processing",
      travel_confirmed: "Travel Confirmed",
      arrived: "Arrived in India",
      treatment_in_progress: "Treatment In Progress",
      discharged: "Discharged",
      follow_up: "Follow-Up Care",
      completed: "Journey Completed",
    };
    return labels[stage] || stage;
  };

  const getCheckInLabel = (type: string) => {
    const labels: Record<string, string> = {
      arrival_india: "Arrival in India",
      airport_pickup: "Airport Pickup",
      accommodation_arrival: "Accommodation Arrival",
      hospital_arrival: "Hospital Arrival",
      treatment_milestone: "Treatment Milestone",
      discharge: "Discharge",
      return_travel: "Return Travel",
    };
    return labels[type] || type;
  };

  const getChecklistLabel = (item: string) => {
    const labels: Record<string, string> = {
      passport_visa: "Passport/Visa Documents Ready",
      hospital_confirmed: "Hospital Details Confirmed",
      coordinator_verified: "Coordinator Identity Checked",
      pickup_confirmed: "Pickup Details Confirmed",
      accommodation_confirmed: "Accommodation Details Confirmed",
      emergency_contacts: "Emergency Contacts Saved",
      treatment_documents: "Treatment Documents Available",
      discharge_plan: "Discharge Plan Received",
      follow_up_instructions: "Follow-Up Instructions Received",
    };
    return labels[item] || item;
  };

  const toggleChecklistItem = async (itemType: string, isCompleted: boolean) => {
    try {
      setError(null);
      const response = await fetch("/api/safety/checklist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          item_type: itemType,
          is_completed: isCompleted,
        }),
      });

      if (response.ok) {
        await loadSafetyData();
      } else {
        const errorData = await response.json();
        setError(`Failed to update checklist: ${errorData.error || 'Please try again'}`);
        await loadSafetyData();
      }
    } catch (err) {
      console.error("Error updating checklist:", err);
      setError("Unable to update checklist. Please check your connection and try again.");
      await loadSafetyData();
    }
  };

  // Trigger Critical Emergency SOS Alert
  const handleTriggerSOS = async () => {
    try {
      setSosLoading(true);
      setError(null);

      const response = await fetch("/api/safety/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "medical_emergency",
          priority: "critical",
          description: "CRITICAL SOS ALERT: Patient triggered immediate SOS assistance beacon from portal dashboard."
        })
      });

      if (response.ok) {
        setSosTriggered(true);
        setSosConfirming(false);
        await loadSafetyData();
      } else {
        const data = await response.json();
        setError(data.error || "Unable to trigger SOS signal. Please call emergency services directly.");
      }
    } catch (err) {
      setError("Network error triggering SOS. Please dial local emergency numbers.");
    } finally {
      setSosLoading(false);
    }
  };

  // Handle uploading documents to HIPAA Vault
  const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadLoading(docType);
      setError(null);
      
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("medical-reports")
        .upload(fileName, file);

      if (uploadError) {
        setError(`Upload failed: ${uploadError.message}`);
        return;
      }

      const { data } = supabase.storage
        .from("medical-reports")
        .getPublicUrl(fileName);

      const fileUrl = data.publicUrl;

      // Register file in notes JSON
      const res = await fetch("/api/safety/profile/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_type: docType,
          file_name: file.name,
          file_url: fileUrl
        })
      });

      if (res.ok) {
        await loadSafetyData();
      } else {
        const errorData = await res.json();
        setError(`Failed to register file in vault: ${errorData.error}`);
      }
    } catch (err: any) {
      setError(`Unexpected error: ${err.message}`);
    } finally {
      setUploadLoading(null);
    }
  };

  // Delete document from vault
  const handleDeleteDocument = async (fileUrl: string) => {
    if (!confirm("Are you sure you want to delete this document from your vault?")) return;
    try {
      setError(null);
      const res = await fetch("/api/safety/profile/documents/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_url: fileUrl })
      });
      if (res.ok) {
        await loadSafetyData();
      } else {
        const errorData = await res.json();
        setError(`Delete failed: ${errorData.error}`);
      }
    } catch (err: any) {
      setError(`Unexpected error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-slate-400">Loading safety information...</p>
        </div>
      </div>
    );
  }

  if (error && !safetyProfile) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertTriangle size={48} className="text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Unable to Load Safety Hub</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold transition"
          >
            Return to Home
            <ArrowRight size={18} />
          </a>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <TrustVerificationBar />
      
      {/* Global Header Banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-slate-950 to-cyan-950 py-12 border-b border-slate-800">
        <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-blue-500/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-cyan-500/10 blur-[150px] rounded-full" />
        
        <div className="relative max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <ShieldCheck size={32} className="text-green-400 animate-pulse" />
              <span className="text-green-400 font-semibold tracking-wide text-xs sm:text-sm">SMART TOURIST PROTECTION HUB</span>
            </div>
            <AccountMenu />
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-white tracking-tight">
            Patient Portal & Safety Hub
          </h1>
          <p className="text-slate-400 text-sm sm:text-base mt-2 max-w-2xl">
            Verified traveler support, health vault, flight coordinates, and SOS response team integration.
          </p>
        </div>
      </section>

      {/* Tabs Navigation Bar */}
      <div className="bg-slate-950 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md bg-opacity-80">
        <div className="max-w-6xl mx-auto px-4 overflow-x-auto flex gap-1 py-3 scrollbar-none">
          {(["safety", "travel", "medical", "documents", "support"] as const).map((tab) => {
            const labels = {
              safety: "Safety & SOS",
              travel: "Travel & Stay",
              medical: "Medical Profile",
              documents: "Document Vault",
              support: "Cases & Help"
            };
            const icons = {
              safety: ShieldCheck,
              travel: Plane,
              medical: Stethoscope,
              documents: FileText,
              support: LifeBuoy
            };
            const IconComponent = icons[tab];
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                }`}
              >
                <IconComponent size={16} />
                {labels[tab]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8 min-h-[50vh]">
        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400 px-5 py-4 flex items-start gap-3">
            <AlertCircle className="shrink-0 mt-0.5" size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* SOS Alarm Status banner */}
        {sosTriggered && (
          <div className="rounded-[32px] border border-red-800 bg-red-950/20 p-8 flex flex-col md:flex-row items-center gap-6 animate-pulse">
            <ShieldAlert size={48} className="text-red-500 shrink-0" />
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold text-red-400">CRITICAL EMERGENCY SOS ACTIVE</h2>
              <p className="text-slate-300 mt-2">
                Emergency signal dispatched. Your assigned care coordinator and our rapid response team are coordinating with local authorities. Keep this browser profile open.
              </p>
            </div>
            <a
              href="tel:+919116734675"
              className="px-6 py-4 rounded-2xl bg-red-600 hover:bg-red-500 font-semibold text-white transition flex items-center gap-2"
            >
              <Phone size={20} />
              Call Response Team
            </a>
          </div>
        )}

        {/* Active Tab Panels */}
        {!safetyProfile ? (
          <div className="rounded-[32px] border border-slate-800 bg-slate-900/50 backdrop-blur-3xl p-8 text-center">
            <ShieldCheck size={48} className="text-slate-600 mx-auto mb-4 animate-pulse" />
            <h2 className="text-2xl font-bold text-white">Smart Protection Not Active</h2>
            <p className="text-slate-400 text-base max-w-lg mx-auto mt-2 leading-relaxed">
              Smart Tourist Protection has not been activated for your journey. Please contact your coordinator to enable safety tools.
            </p>
          </div>
        ) : (
          <>
            {/* TAB 1: SAFETY & SOS */}
            {activeTab === "safety" && (
              <div className="space-y-8">
                {/* Emergency Quick SOS Button Grid */}
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 rounded-[32px] border border-red-800/40 bg-gradient-to-r from-red-950/40 to-slate-950 p-8 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-red-400 text-xs font-semibold uppercase tracking-wider mb-2">
                        <AlertTriangle size={14} className="animate-bounce" />
                        Immediate Response Required
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-bold text-white">Emergency SOS</h3>
                      <p className="text-slate-400 text-sm sm:text-base mt-2 leading-relaxed">
                        Experiencing an immediate threat, medical event, or physical danger? Press the SOS trigger. It immediately updates your risk profile and dispatches rapid support.
                      </p>
                    </div>
                    
                    <div className="mt-6 flex flex-wrap gap-4">
                      {!sosTriggered ? (
                        <button
                          onClick={() => setSosConfirming(true)}
                          className="px-8 py-4 bg-red-600 hover:bg-red-500 rounded-2xl font-bold text-white transition-all shadow-[0_0_40px_rgba(239,68,68,0.25)] flex items-center gap-2"
                        >
                          <ShieldAlert size={20} />
                          Trigger SOS Alert
                        </button>
                      ) : (
                        <span className="text-red-400 font-bold flex items-center gap-2 bg-red-950/40 px-5 py-3 rounded-xl border border-red-800">
                          SOS Beacon Pulsing...
                        </span>
                      )}
                      <a
                        href="tel:+919116734675"
                        className="px-6 py-4 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl font-semibold text-slate-300 transition flex items-center gap-2"
                      >
                        <Phone size={18} />
                        Call Helpline
                      </a>
                    </div>
                  </div>

                  {/* Local Emergency numbers */}
                  <div className="rounded-[32px] border border-slate-800 bg-slate-950 p-8 space-y-4">
                    <h4 className="text-lg font-bold text-slate-200">Local Safety Contacts</h4>
                    <div className="space-y-3.5 text-sm">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                        <span className="text-slate-500">Rapid Response Team</span>
                        <a href="tel:+919116734675" className="font-semibold text-blue-400 hover:underline">+91 91167 34675</a>
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                        <span className="text-slate-500">Police & Medical (India)</span>
                        <a href="tel:112" className="font-semibold text-red-400 hover:underline">112</a>
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                        <span className="text-slate-500">Assigned Hospital</span>
                        <span className="font-medium text-slate-300 truncate max-w-[120px]" title={safetyProfile.hospital_name || "Unassigned"}>
                          {safetyProfile.hospital_name || "Unassigned"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Embassy Helpline</span>
                        <span className="font-semibold text-slate-400">Available in Cases tab</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Confirm SOS Trigger Modal */}
                {sosConfirming && (
                  <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-950 border border-red-800 rounded-[32px] w-full max-w-md p-8 text-center shadow-2xl relative">
                      <AlertTriangle size={64} className="text-red-500 mx-auto mb-5 animate-pulse" />
                      <h3 className="text-2xl font-bold text-white">Trigger Critical SOS Alert?</h3>
                      <p className="text-slate-400 mt-3 text-sm leading-relaxed">
                        This action will immediately alert your dedicated coordinator and elevate your risk level to critical. Do you wish to proceed?
                      </p>
                      
                      <div className="mt-8 flex gap-4">
                        <button
                          onClick={() => setSosConfirming(false)}
                          className="flex-1 py-4 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl font-semibold text-slate-300 transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleTriggerSOS}
                          disabled={sosLoading}
                          className="flex-1 py-4 bg-red-600 hover:bg-red-500 rounded-2xl font-bold text-white transition flex justify-center items-center gap-2"
                        >
                          {sosLoading ? "Sending Alert..." : "Yes, Trigger SOS"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Real-time Safety Action Recommendation */}
                <SafetyRecommendationBanner />

                {/* Unified Protection Status */}
                {protectionStatusData && (
                  <ProtectionStatus
                    status={protectionStatusData.protectionStatus}
                    latestCheckIn={protectionStatusData.latestCheckIn}
                    checklistProgress={protectionStatusData.checklistProgress}
                    coordinatorStatus={protectionStatusData.coordinatorStatus}
                    activeAssistance={protectionStatusData.activeAssistance}
                    recommendation={protectionStatusData.recommendation}
                  />
                )}

                {riskData && (
                  <div className="bg-slate-950 border border-slate-800 rounded-[32px] p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <AlertTriangle size={24} className="text-orange-400" />
                      <h2 className="text-2xl font-bold">Current Risk Summary</h2>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                        <p className="text-slate-500 uppercase text-xs tracking-wide mb-2">Risk Level</p>
                        <p className="text-3xl font-bold text-white capitalize">{riskData.risk_level}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                        <p className="text-slate-500 uppercase text-xs tracking-wide mb-2">Status</p>
                        <p className="text-lg font-semibold text-slate-100">{riskData.patient_safe_status}</p>
                      </div>
                    </div>
                    <div className="mt-6 text-slate-400 text-sm leading-relaxed">
                      <p>{riskData.explanation}</p>
                    </div>
                    {riskData.recommended_actions.length > 0 && (
                      <div className="mt-6">
                        <p className="text-slate-500 uppercase text-xs tracking-wide mb-3">Recommended Actions</p>
                        <ul className="space-y-2 text-sm text-slate-300">
                          {riskData.recommended_actions.map((action, index) => (
                            <li key={index} className="flex items-start gap-3">
                              <span className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-400 shrink-0" />
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Safety Journey Stages Timeline */}
                <div className="bg-slate-950 border border-slate-800 rounded-[32px] p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <Activity size={24} className="text-purple-400" />
                    <h2 className="text-2xl font-bold">Protection Journey Log</h2>
                  </div>
                  
                  <div className="space-y-4">
                    {[
                      ...(checkIns?.map(mapCheckInToTimeline) || []),
                      ...(checklist?.map(mapChecklistToTimeline) || []),
                      ...(safetyCases?.map(mapCaseToTimeline) || []),
                      ...(coordinatorVerification ? [mapCoordinatorToTimeline(coordinatorVerification)] : []),
                    ].length > 0 ? (
                      sortTimelineByTimestamp([
                        ...(checkIns?.map(mapCheckInToTimeline) || []),
                        ...(checklist?.map(mapChecklistToTimeline) || []),
                        ...(safetyCases?.map(mapCaseToTimeline) || []),
                        ...(coordinatorVerification ? [mapCoordinatorToTimeline(coordinatorVerification)] : []),
                      ]).slice(0, 10).map((event) => {
                        const colors = getTimelineStatusColorClasses(event.status);
                        return (
                          <div
                            key={event.id}
                            className="flex items-center gap-4 p-4 bg-slate-900/50 border border-slate-800 rounded-2xl hover:border-slate-700 transition"
                          >
                            <div className={`p-2.5 rounded-xl border shrink-0 ${colors.bg} ${colors.border}`}>
                              <CheckCircle size={18} className={colors.icon} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-white truncate text-sm sm:text-base">{event.title}</p>
                              <p className="text-slate-400 text-xs sm:text-sm mt-0.5 truncate">{event.description}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colors.badge}`}>
                                {event.status}
                              </span>
                              <p className="text-slate-500 text-[10px] sm:text-xs mt-1">
                                {new Date(event.timestamp).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-center py-6 text-slate-500">No protection logs available yet.</p>
                    )}
                  </div>
                </div>

                {/* Journey Safety Checklist */}
                <div id="safety-checklist" className="bg-slate-950 border border-slate-800 rounded-[32px] p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <FileText size={24} className="text-cyan-400" />
                    <h2 className="text-2xl font-bold">Safety Milestone Checkpoints</h2>
                  </div>
                  
                  {checklist.length > 0 ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {checklist.map((item) => (
                        <button
                          key={item.item_type}
                          onClick={() => toggleChecklistItem(item.item_type, !item.is_completed)}
                          className={`flex items-center gap-3.5 p-4.5 rounded-2xl border text-left transition-all ${
                            item.is_completed
                              ? "bg-green-500/10 border-green-500/20 hover:bg-green-500/20"
                              : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          {item.is_completed ? (
                            <CheckCircle size={20} className="text-green-400 shrink-0" />
                          ) : (
                            <Clock size={20} className="text-slate-500 shrink-0 animate-pulse" />
                          )}
                          <span className="text-xs sm:text-sm font-medium">{getChecklistLabel(item.item_type)}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-6 text-slate-500">No checklist items configured.</p>
                  )}
                </div>

                {/* Coordinator Card */}
                {coordinatorVerification && coordinatorVerification.is_verified ? (
                  <div id="safety-coordinator" className="bg-slate-950 border border-slate-800 rounded-[32px] p-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div className="flex items-center gap-3">
                        <UserRoundCheck size={26} className="text-green-400" />
                        <h2 className="text-2xl font-bold text-white">Your Care Coordinator</h2>
                      </div>
                      <span className="self-start sm:self-auto bg-green-500/20 border border-green-500/30 text-green-400 px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5">
                        <UserCheck size={14} />
                        Assigned & Verified
                      </span>
                    </div>

                    <div className="grid md:grid-cols-3 gap-5">
                      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5">
                        <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider block mb-1">Coordinator</span>
                        <p className="text-lg font-bold text-slate-200">{coordinatorVerification.full_name}</p>
                      </div>
                      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5">
                        <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider block mb-1">Reference ID</span>
                        <p className="text-lg font-bold text-blue-400 tracking-wider">{coordinatorVerification.reference_id}</p>
                      </div>
                      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5">
                        <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider block mb-1">Call Coordinator</span>
                        <a href={`tel:${coordinatorVerification.phone}`} className="text-lg font-bold text-green-400 flex items-center gap-2 hover:underline">
                          <Phone size={18} />
                          {coordinatorVerification.phone}
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[32px] border border-slate-850 bg-slate-950 p-8 text-center">
                    <UserRoundCheck size={48} className="text-slate-700 mx-auto mb-4" />
                    <h3 className="text-xl font-bold">Assigning Coordinator</h3>
                    <p className="text-slate-400 text-sm mt-2 max-w-sm mx-auto">
                      HealWithIndia will assign an official, background-checked medical coordinator shortly. Keep this panel open to check credentials.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: TRAVEL & ACCOMMODATION */}
            {activeTab === "travel" && (
              <div id="safety-travel" className="space-y-8 animate-in fade-in duration-300">
                {/* Flight details */}
                <div className="rounded-[32px] border border-slate-800 bg-slate-950 p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <Plane size={24} className="text-blue-400" />
                    <h2 className="text-2xl font-bold">Flight Details & Airport Pickup</h2>
                  </div>

                  {safetyProfile.extra?.flight_number ? (
                    <div className="grid md:grid-cols-3 gap-6">
                      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5">
                        <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider block mb-1.5">Flight Number</span>
                        <p className="text-lg font-bold text-slate-100">{safetyProfile.extra.flight_number}</p>
                      </div>
                      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5">
                        <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider block mb-1.5">Departure / Arrival Time</span>
                        <p className="text-lg font-bold text-slate-200">{safetyProfile.extra.flight_departure_time || "—"}</p>
                      </div>
                      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5">
                        <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider block mb-1.5">Airport Pickup Status</span>
                        <span className="inline-flex items-center gap-1.5 mt-1 text-green-400 font-bold bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full text-xs">
                          <CheckCircle size={12} />
                          Driver Dispatched
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-slate-900/20 rounded-2xl border border-slate-850">
                      <Plane size={36} className="text-slate-600 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">No flight coordinates registered. Click edit details inside Admin CRM.</p>
                    </div>
                  )}
                </div>

                {/* Hotel details */}
                <div className="rounded-[32px] border border-slate-800 bg-slate-950 p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <Hotel size={24} className="text-cyan-400" />
                    <h2 className="text-2xl font-bold">Accommodation Stay Details</h2>
                  </div>

                  {safetyProfile.extra?.hotel_name ? (
                    <div className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5">
                          <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider block mb-1.5">Hotel Name</span>
                          <p className="text-lg font-bold text-slate-100">{safetyProfile.extra.hotel_name}</p>
                        </div>
                        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5">
                          <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider block mb-1.5">Booking Reference</span>
                          <p className="text-lg font-bold text-blue-400 tracking-wider">{safetyProfile.extra.hotel_booking_reference || "—"}</p>
                        </div>
                      </div>

                      {safetyProfile.extra?.hotel_address && (
                        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5">
                          <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider block mb-1.5">Address</span>
                          <p className="text-sm sm:text-base text-slate-300 font-medium">{safetyProfile.extra.hotel_address}</p>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(safetyProfile.extra.hotel_address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 mt-4 text-xs font-semibold text-blue-400 hover:underline"
                          >
                            <Navigation size={12} />
                            Get Directions on Maps
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-slate-900/20 rounded-2xl border border-slate-850">
                      <Hotel size={36} className="text-slate-600 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">No accommodation details registered by coordinator yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: MEDICAL PROFILE */}
            {activeTab === "medical" && (
              <div id="safety-medical" className="space-y-8 animate-in fade-in duration-300">
                {/* Doctor and treatment info */}
                <div className="rounded-[32px] border border-slate-800 bg-slate-950 p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <Stethoscope size={24} className="text-blue-400" />
                    <h2 className="text-2xl font-bold">Medical Hospital & Doctor Care</h2>
                  </div>

                  <div className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5">
                        <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider block mb-1.5">Assigned Hospital</span>
                        <div className="flex items-center gap-2.5">
                          <Building size={20} className="text-slate-400 shrink-0" />
                          <p className="text-lg font-bold text-slate-100">{safetyProfile.hospital_name || "Pending Selection"}</p>
                        </div>
                      </div>
                      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5">
                        <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider block mb-1.5">Assigned Doctor</span>
                        <div className="flex items-center gap-2.5">
                          <UserCheck size={20} className="text-slate-400 shrink-0" />
                          <p className="text-lg font-bold text-slate-100">{safetyProfile.extra?.doctor_name || "Pending Assignment"}</p>
                        </div>
                      </div>
                    </div>

                    {safetyProfile.extra?.treatment_plan_summary && (
                      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                          <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Treatment Plan Summary</span>
                          <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded-md text-[10px] font-bold">HIPAA Secure</span>
                        </div>
                        <p className="text-slate-300 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                          {safetyProfile.extra.treatment_plan_summary}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Medical History */}
                <div className="rounded-[32px] border border-slate-800 bg-slate-950 p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <Heart size={24} className="text-pink-400" />
                    <h2 className="text-2xl font-bold">Health History & Allergies</h2>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5">
                      <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider block mb-1.5">Blood Group</span>
                      <p className="text-lg font-bold text-slate-200">{safetyProfile.extra?.blood_group || "Not Stated"}</p>
                    </div>
                    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5">
                      <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider block mb-1.5">Allergies</span>
                      <p className="text-lg font-bold text-red-400">{safetyProfile.extra?.allergies || "None Declared"}</p>
                    </div>
                    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5">
                      <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider block mb-1.5">Emergency Contacts</span>
                      <p className="text-base font-bold text-slate-300 truncate">{safetyProfile.extra?.emergency_contacts || "None Declared"}</p>
                    </div>
                  </div>

                  {safetyProfile.extra?.medical_history && (
                    <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 mt-6">
                      <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider block mb-3">Medical History Details</span>
                      <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                        {safetyProfile.extra.medical_history}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: DOCUMENT VAULT */}
            {activeTab === "documents" && (
              <div id="safety-documents" className="space-y-8 animate-in fade-in duration-300">
                <div className="rounded-[32px] border border-slate-800 bg-slate-950 p-8">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-2xl font-bold">Document Vault</h2>
                      <p className="text-slate-400 text-sm mt-1">Upload and back up your critical visa, passport, and health records securely.</p>
                    </div>
                    <span className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 self-start lg:self-auto">
                      <FileCheck size={14} />
                      AES-256 Encrypted
                    </span>
                  </div>

                  {/* Document uploads lists by categories */}
                  <div className="grid md:grid-cols-2 gap-6">
                    {["passport", "visa", "insurance", "medical_report"].map((docCategory) => {
                      const titles: Record<string, string> = {
                        passport: "Passport Copy Backup",
                        visa: "Visa Copy Backup",
                        insurance: "Insurance Policy PDF",
                        medical_report: "Other Medical Reports"
                      };
                      const categoryDocs = safetyProfile.extra?.documents?.filter(d => d.type === docCategory) || [];
                      const isUploading = uploadLoading === docCategory;
                      
                      return (
                        <div key={docCategory} className="bg-slate-900/30 border border-slate-850 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                          <div>
                            <div className="flex justify-between items-center border-b border-slate-850 pb-2.5 mb-3">
                              <h4 className="text-sm font-bold text-slate-200">{titles[docCategory]}</h4>
                              <span className="text-xs text-slate-500 font-semibold">{categoryDocs.length} files</span>
                            </div>
                            
                            {categoryDocs.length > 0 ? (
                              <div className="space-y-2">
                                {categoryDocs.map((doc, idx) => (
                                  <div key={idx} className="flex justify-between items-center bg-black border border-slate-850 rounded-xl p-3 text-xs">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <FileText size={14} className="text-blue-400 shrink-0" />
                                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-400 hover:underline truncate max-w-[140px]" title={doc.name}>
                                        {doc.name}
                                      </a>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="text-slate-600">{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                                      <button onClick={() => handleDeleteDocument(doc.url)} className="text-red-500 hover:text-red-400 transition p-1">
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-500 italic py-2">No documents stored under this category.</p>
                            )}
                          </div>

                          <div className="pt-2">
                            <label className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-slate-800 hover:border-slate-700 bg-slate-950 hover:bg-slate-900/60 rounded-xl text-xs font-semibold cursor-pointer transition">
                              {uploadLoading === docCategory ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-400" />
                              ) : (
                                <>
                                  <Upload size={14} className="text-slate-500" />
                                  <span>Upload New File</span>
                                </>
                              )}
                              <input
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg"
                                onChange={(e) => handleUploadDocument(e, docCategory)}
                                disabled={uploadLoading !== null}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: CASES & HELP */}
            {activeTab === "support" && (
              <div id="safety-support" className="space-y-8 animate-in fade-in duration-300">
                {/* Active and incident history list */}
                <div className="rounded-[32px] border border-slate-800 bg-slate-950 p-8">
                  <div className="flex items-center justify-between mb-6 border-b border-slate-850 pb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-white">Your Assistance Cases</h2>
                      <p className="text-slate-400 text-sm mt-1">Review active and resolved support requests filed in the portal.</p>
                    </div>
                    <a
                      href="/safety/urgent-help"
                      className="px-4 py-2.5 bg-red-600 hover:bg-red-500 rounded-xl font-semibold text-xs sm:text-sm text-white transition flex items-center gap-1.5"
                    >
                      <Plus size={16} />
                      File Support Case
                    </a>
                  </div>

                  {safetyCases.length > 0 ? (
                    <div className="space-y-4">
                      {safetyCases.map((scCase) => {
                        const priorities: Record<string, string> = {
                          low: "text-slate-400 border-slate-900 bg-slate-950",
                          medium: "text-yellow-400 border-yellow-950 bg-yellow-950/10",
                          high: "text-orange-400 border-orange-950 bg-orange-950/10",
                          critical: "text-red-400 border-red-950 bg-red-950/10"
                        };
                        const statuses: Record<string, string> = {
                          open: "text-blue-400 border-blue-900 bg-blue-950/15",
                          acknowledged: "text-purple-400 border-purple-900 bg-purple-950/15",
                          in_progress: "text-amber-400 border-amber-900 bg-amber-950/15",
                          resolved: "text-green-400 border-green-900 bg-green-950/15",
                          closed: "text-slate-500 border-slate-900 bg-slate-950/15"
                        };
                        return (
                          <Link
                            key={scCase.id}
                            href={`/safety/case/${scCase.id}`}
                            className="block bg-slate-900/40 border border-slate-850 rounded-2xl p-5 transition hover:border-blue-500/40"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-850 pb-3 mb-3">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-200 capitalize text-sm">{scCase.category.replace("_", " ")}</span>
                                <span className="text-slate-600 text-xs">| ID: {scCase.id.slice(0, 8)}</span>
                              </div>
                              <div className="flex gap-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${priorities[scCase.priority] || priorities.medium}`}>
                                  {scCase.priority}
                                </span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statuses[scCase.status] || statuses.open}`}>
                                  {scCase.status.replace(/_/g, " ")}
                                </span>
                              </div>
                            </div>

                            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">{scCase.description}</p>
                            <div className="mt-4 flex items-center justify-between text-[10px] sm:text-xs text-slate-600 font-medium">
                              <span>Filed: {new Date(scCase.created_at).toLocaleString()}</span>
                              {scCase.status !== "resolved" && scCase.status !== "closed" && (
                                <span className="text-blue-400">Response Team Reviewing...</span>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-slate-900/20 rounded-2xl border border-slate-850">
                      <LifeBuoy size={40} className="text-slate-700 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">No support cases registered under your account.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default function SafetyHubPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-slate-200 p-8 flex items-center justify-center font-medium">Loading Safety Hub...</div>}>
      <SafetyHubContent />
    </Suspense>
  );
}
