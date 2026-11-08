import { createClient, createServiceRoleClient } from "@/lib/supabaseServer";
import { getAuthenticatedAdmin } from "@/lib/auth/admin-auth";
import { redirect } from "next/navigation";
import Topbar from "@/components/Topbar";
import PatientPageClient from "./PatientPageClient";
import { ResilientDatabase } from "@/lib/fallback/mockDatabase";

export default async function PatientsPage() {
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
          role: "admin",
          is_staff: true,
          auth_mode: "supabase",
        };
      }
    } catch {
      // Ignored: Supabase unreachable
    }
  }

  if (!user) {
    redirect("/admin/login");
  }

  let processedPatients: any[] = [];
  let fetchError: string | null = null;

  try {
    const serviceSupabase = createServiceRoleClient();
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Supabase query timeout")), 2500)
    );

    const [authRes, patientsRes]: any = await Promise.race([
      Promise.all([
        serviceSupabase.auth.admin.listUsers().catch(() => ({ data: null })),
        serviceSupabase
          .from("patients")
          .select(`
            *,
            patient_auth_mapping(portal_access_status, invite_sent_at, portal_access_enabled_at, auth_user_id),
            patient_safety_profiles(protection_status, journey_stage, protection_activated_at, protection_completed_at),
            coordinator_assignments(is_active, official_coordinators(full_name, reference_id)),
            risk_assessments(is_current, risk_level)
          `)
          .order("created_at", { ascending: false }),
      ]),
      timeout,
    ]);

    const authUsersData = authRes?.data;
    const authUsersMap = new Map(authUsersData?.users?.map((u: any) => [u.id, u]) || []);
    const { data: patients, error } = patientsRes;

    if (!error && patients && patients.length > 0) {
      processedPatients = patients.map((patient: any) => {
        const mapping = Array.isArray(patient.patient_auth_mapping)
          ? patient.patient_auth_mapping[0]
          : patient.patient_auth_mapping;

        const authUser: any = mapping?.auth_user_id ? authUsersMap.get(mapping.auth_user_id) : null;

        return {
          ...patient,
          patient_auth_mapping: mapping,
          auth_user: authUser
            ? {
                last_sign_in_at: authUser.last_sign_in_at,
                created_at: authUser.created_at,
              }
            : null,
        };
      });
    } else if (error) {
      throw error;
    }
  } catch (err: any) {
    fetchError = err?.message || null;
  }

  // Fallback to ResilientDatabase if remote data is empty or query failed
  if (processedPatients.length === 0) {
    const fallbackPatients = ResilientDatabase.getPatients();
    processedPatients = fallbackPatients.map((p) => ({
      ...p,
      patient_auth_mapping: {
        portal_access_status: p.id === 1 ? "active" : "pending",
        invite_sent_at: p.created_at,
        portal_access_enabled_at: p.id === 1 ? p.created_at : undefined,
      },
      patient_safety_profiles: {
        protection_status: p.id === 1 ? "Active" : "Protected",
        journey_stage: p.id === 1 ? "In-Transit" : "Pre-Treatment",
        protection_activated_at: p.created_at,
      },
      coordinator_assignments: [
        {
          is_active: true,
          official_coordinators: {
            full_name: "Rahul Verma",
            reference_id: "HWI-COORD-001",
          },
        },
      ],
      risk_assessments: [
        {
          is_current: true,
          risk_level: p.id === 1 ? "Low" : "Moderate",
        },
      ],
      auth_user:
        p.id === 1
          ? {
              last_sign_in_at: new Date().toISOString(),
              created_at: p.created_at,
            }
          : null,
    }));
  }

  const totalPatients = processedPatients.length;
  const uniqueTreatments = new Set(processedPatients.map((p) => p.treatment)).size;
  const uniqueCountries = new Set(processedPatients.map((p) => p.country)).size;
  const contacted = processedPatients.filter((p) => p.status === "Contacted").length;

  return (
    <main className="p-10 text-white">
      <Topbar />
      <PatientPageClient
        stats={{ totalPatients, uniqueTreatments, uniqueCountries, contacted }}
        patients={processedPatients}
      />
    </main>
  );
}
