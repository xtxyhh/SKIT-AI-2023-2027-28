/**
 * Patient Relational Assignment Domain Definitions
 * Project: HealWithIndia Medical Tourism Platform
 * 
 * Provides strong typing for relational tables linking patients to assigned
 * healthcare specialists, multidisciplinary care teams, hospital beds, and
 * clinical treatments.
 */

export type DoctorAssignmentRole = 
  | 'primary_physician'
  | 'attending_surgeon'
  | 'consulting_specialist'
  | 'anesthesiologist'
  | 'rehabilitation_specialist';

export type AssignmentStatus = 'active' | 'completed' | 'transferred' | 'revoked';

export interface PatientDoctorAssignment {
  id: string;
  patient_id: number;
  doctor_id: string;
  role: DoctorAssignmentRole;
  status: AssignmentStatus;
  is_lead_doctor: boolean;
  consultation_date?: string | null;
  consultation_notes?: string | null;
  treatment_goals?: string | null;
  assigned_by?: string;
  assigned_at: string;
  created_at: string;
  updated_at: string;
  doctor?: {
    id: string;
    full_name: string;
    specialty: string;
    qualification?: string;
    experience_years?: number;
    avatar_url?: string;
    rating?: number;
    hospital_id?: string;
  };
}

export type CareTeamRole =
  | 'lead_nurse'
  | 'medical_interpreter'
  | 'patient_advocate'
  | 'dietitian'
  | 'physiotherapist'
  | 'logistics_coordinator';

export type WorkShift = 'morning' | 'evening' | 'night' | 'rotational' | 'on_call';

export interface PatientCareTeamAssignment {
  id: string;
  patient_id: number;
  staff_name: string;
  staff_role: CareTeamRole;
  phone?: string | null;
  email?: string | null;
  languages_spoken: string[];
  shift: WorkShift;
  is_primary_contact: boolean;
  emergency_reachable: boolean;
  special_instructions?: string | null;
  assigned_at: string;
  created_at: string;
  updated_at: string;
}

export type TreatmentAssignmentStage =
  | 'scheduled'
  | 'pre_op'
  | 'in_procedure'
  | 'post_op'
  | 'rehabilitation'
  | 'completed'
  | 'deferred';

export interface PatientTreatmentAssignment {
  id: string;
  patient_id: number;
  treatment_id: string;
  package_id?: string | null;
  supervising_doctor_id?: string | null;
  hospital_id?: string | null;
  stage: TreatmentAssignmentStage;
  scheduled_date?: string | null;
  estimated_duration_days: number;
  actual_procedure_date?: string | null;
  discharge_date?: string | null;
  pre_op_requirements?: string | null;
  post_op_guidelines?: string | null;
  discharge_summary_url?: string | null;
  assigned_at: string;
  created_at: string;
  updated_at: string;
  treatment?: {
    id: string;
    name: string;
    category: string;
    slug: string;
    duration_days?: number;
  };
  supervising_doctor?: {
    id: string;
    full_name: string;
    specialty: string;
  };
  hospital?: {
    id: string;
    name: string;
    city: string;
  };
}

export type HospitalRoomType = 'general' | 'semi_private' | 'private_deluxe' | 'icu' | 'suite';

export type HospitalAdmissionStatus =
  | 'reserved'
  | 'admitted'
  | 'in_surgery'
  | 'recovering'
  | 'discharged'
  | 'cancelled';

export interface PatientHospitalAssignment {
  id: string;
  patient_id: number;
  hospital_id: string;
  ward_department: string;
  room_number?: string | null;
  bed_number?: string | null;
  room_type: HospitalRoomType;
  admission_date?: string | null;
  expected_discharge_date?: string | null;
  actual_discharge_date?: string | null;
  status: HospitalAdmissionStatus;
  nurse_station_contact?: string | null;
  special_dietary_needs?: string | null;
  emergency_notes?: string | null;
  assigned_at: string;
  created_at: string;
  updated_at: string;
  hospital?: {
    id: string;
    name: string;
    city: string;
    accreditation?: string;
  };
}

export type EscortRole = 'airport_greeter' | 'chauffeur' | 'medical_escort' | 'local_guide';
export type EscortStatus = 'assigned' | 'en_route' | 'waiting' | 'completed' | 'cancelled';

export interface PatientEscortAssignment {
  id: string;
  patient_id: number;
  escort_name: string;
  escort_role: EscortRole;
  phone: string;
  vehicle_type?: string | null;
  vehicle_number?: string | null;
  meeting_location?: string | null;
  scheduled_pickup_time?: string | null;
  status: EscortStatus;
  notes?: string | null;
  assigned_at: string;
  created_at: string;
}

export interface PatientCompleteAssignmentsOverview {
  patient_id: number;
  doctors: PatientDoctorAssignment[];
  care_team: PatientCareTeamAssignment[];
  treatments: PatientTreatmentAssignment[];
  hospital_stay: PatientHospitalAssignment | null;
  escort: PatientEscortAssignment | null;
  active_lead_doctor?: PatientDoctorAssignment | null;
}

// Request DTOs
export interface AssignDoctorDTO {
  patient_id: number;
  doctor_id: string;
  role?: DoctorAssignmentRole;
  is_lead_doctor?: boolean;
  consultation_date?: string;
  consultation_notes?: string;
  treatment_goals?: string;
}

export interface AssignCareTeamDTO {
  patient_id: number;
  staff_name: string;
  staff_role: CareTeamRole;
  phone?: string;
  email?: string;
  languages_spoken?: string[];
  shift?: WorkShift;
  is_primary_contact?: boolean;
  special_instructions?: string;
}

export interface AssignTreatmentDTO {
  patient_id: number;
  treatment_id: string;
  package_id?: string;
  supervising_doctor_id?: string;
  hospital_id?: string;
  scheduled_date?: string;
  estimated_duration_days?: number;
  pre_op_requirements?: string;
}

export interface AssignHospitalBedDTO {
  patient_id: number;
  hospital_id: string;
  ward_department?: string;
  room_number?: string;
  bed_number?: string;
  room_type?: HospitalRoomType;
  admission_date?: string;
  expected_discharge_date?: string;
  special_dietary_needs?: string;
}
