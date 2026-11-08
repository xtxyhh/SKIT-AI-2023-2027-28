/**
 * Resilient In-Memory & Fallback Database for HealWithIndia
 * Used when remote cloud Supabase instance is unreachable, paused, or in local evaluation mode.
 * Provides complete data fidelity, full CRUD mutation support, and persistent state across queries.
 */

import fs from "fs";
import path from "path";

export interface FallbackPatient {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  country: string;
  treatment: string;
  description: string;
  status: string;
  report_url: string;
  notes: string;
  assigned_hospital: string;
  estimated_revenue: number;
  created_at: string;
  updated_at: string;
}

export interface FallbackHospital {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  country: string;
  accreditation: string;
  rating: number;
  bed_count: number;
  established_year: number;
  description: string;
  image_url?: string;
  specialties?: string[];
  contact_phone?: string;
  contact_email?: string;
}

export interface FallbackDoctor {
  id: string;
  hospital_id: string;
  full_name: string;
  specialty: string;
  qualification: string;
  experience_years: number;
  rating: number;
  consultation_fee_usd: number;
  bio?: string;
  avatar_url?: string;
  is_available: boolean;
  hospitals?: { id: string; name: string; city: string };
}

export interface FallbackTreatment {
  id: string;
  name: string;
  slug: string;
  category: string;
  department: string;
  description: string;
  duration_days: number;
  recovery_days: number;
  cost_usd_min: number;
  cost_usd_max: number;
  treatment_packages?: any[];
}

export interface FallbackCoordinator {
  id: string;
  reference_id: string;
  full_name: string;
  phone: string;
  email: string;
  assigned_region: string;
  is_active: boolean;
  is_verified?: boolean;
  assigned_at?: string;
}

export interface FallbackEmployee {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  country: string;
  status: string;
  created_at: string;
}

export interface FallbackLead {
  id: number;
  patient_name: string;
  email: string;
  phone: string;
  country: string;
  treatment_requested: string;
  notes: string;
  source: string;
  status: string;
  assigned_coordinator_id?: string | null;
  created_at: string;
  official_coordinators?: { id: string; full_name: string; phone: string } | null;
}

export interface FallbackInvoice {
  id: number;
  patient_id: number;
  invoice_number: string;
  amount_usd: number;
  tax_usd: number;
  total_usd: number;
  due_date: string;
  status: "unpaid" | "partially_paid" | "paid" | "overdue";
  created_at: string;
  payments?: FallbackPayment[];
}

export interface FallbackQuote {
  id: number;
  patient_id: number;
  treatment_id?: string;
  hospital_id?: string;
  amount_usd: number;
  status: "draft" | "sent" | "accepted" | "rejected";
  validity_date: string;
  created_at: string;
}

export interface FallbackPayment {
  id: number;
  invoice_id: number;
  patient_id: number;
  amount_usd: number;
  payment_method: string;
  transaction_ref: string;
  status: "completed" | "pending" | "failed";
  created_at: string;
}

export interface FallbackCheckIn {
  id: string;
  patient_id: number;
  status: "safe" | "assistance_requested" | "incident_reported";
  location?: string;
  notes?: string;
  check_in_time: string;
  created_at: string;
  patients?: { id: number; full_name: string };
}

export interface FallbackSafetyCase {
  id: string;
  case_number: string;
  patient_id: number;
  category: "medical" | "travel" | "fraud" | "emergency" | "coordination";
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "in_progress" | "acknowledged" | "resolved" | "escalated";
  description: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  patients?: { id: number; full_name: string; country: string };
}

// Initial Core Datasets
export const FALLBACK_PATIENTS: FallbackPatient[] = [
  {
    id: 1,
    full_name: "Tariq Al-Mansoor",
    email: "tariq.mansoor@example.com",
    phone: "+971 50 123 4567",
    country: "United Arab Emirates",
    treatment: "Cardiology - Coronary Bypass",
    description: "Referred for advanced minimally invasive robotic cardiac surgery.",
    status: "Treatment Started",
    report_url: "https://example.com/reports/tariq_cardio.pdf",
    notes: JSON.stringify({
      notes_text: "Referred for robotic cardiac surgery at Medanta.",
      estimated_cost: 9500,
      paid_amount: 9500,
      currency: "USD",
      invoice_status: "PAID",
      flight_number: "EK-512",
      flight_departure_time: "2026-10-18T06:30:00Z",
      hotel_name: "The Oberoi, New Delhi",
      hotel_address: "Dr Zakir Hussain Marg, New Delhi 110003",
      hotel_booking_reference: "OB-789124",
      doctor_name: "Dr. Naresh Trehan",
      treatment_plan_summary: "4-Vessel CABG with post-op cardiac rehabilitation.",
      allergies: "Penicillin",
      blood_group: "O+",
      emergency_contacts: "Fatima Al-Mansoor (+971 50 987 6543, Spouse)",
      medical_history: "Hypertension, Mild Type 2 Diabetes",
    }),
    assigned_hospital: "Medanta - The Medicity, Gurugram",
    estimated_revenue: 9500,
    created_at: "2026-10-18T10:30:00Z",
    updated_at: "2026-10-21T14:20:00Z",
  },
  {
    id: 2,
    full_name: "Grace Adebayo",
    email: "grace.adebayo@example.com",
    phone: "+234 803 456 7890",
    country: "Nigeria",
    treatment: "Orthopedics - Bilateral Knee Replacement",
    description: "Severe osteoarthritis, seeking computer-navigated joint replacement.",
    status: "Hospital Assigned",
    report_url: "https://example.com/reports/grace_ortho.pdf",
    notes: JSON.stringify({
      notes_text: "Seeking computer-navigated joint replacement.",
      estimated_cost: 7200,
      paid_amount: 3600,
      currency: "USD",
      invoice_status: "PARTIALLY_PAID",
      flight_number: "ET-688",
      flight_departure_time: "2026-10-19T04:15:00Z",
      hotel_name: "Crowne Plaza, Gurugram",
      hotel_address: "Sector 29, Gurugram",
      hotel_booking_reference: "CP-445892",
      doctor_name: "Dr. Ashok Rajgopal",
      treatment_plan_summary: "Bilateral Robotic Knee Arthroplasty + Physio.",
      allergies: "None",
      blood_group: "A+",
      emergency_contacts: "Ade Adebayo (+234 802 334 5566, Son)",
    }),
    assigned_hospital: "Fortis Memorial Research Institute, Gurugram",
    estimated_revenue: 7200,
    created_at: "2026-10-19T08:15:00Z",
    updated_at: "2026-10-20T11:45:00Z",
  },
  {
    id: 3,
    full_name: "Elena Rostova",
    email: "elena.rostova@example.com",
    phone: "+7 916 234 5678",
    country: "Uzbekistan",
    treatment: "Oncology - CyberKnife Radiosurgery",
    description: "Benign intracranial acoustic neuroma consultation.",
    status: "Consultation",
    report_url: "https://example.com/reports/elena_mri.pdf",
    notes: JSON.stringify({
      notes_text: "Benign intracranial acoustic neuroma consultation.",
      estimated_cost: 8800,
      paid_amount: 0,
      currency: "USD",
      invoice_status: "UNPAID",
      hotel_name: "Radisson Blu, Paschim Vihar",
      doctor_name: "Dr. Harit Chaturvedi",
      treatment_plan_summary: "CyberKnife stereotactic radiosurgery protocol.",
    }),
    assigned_hospital: "Apollo Hospitals, Indraprastha, New Delhi",
    estimated_revenue: 8800,
    created_at: "2026-10-21T12:00:00Z",
    updated_at: "2026-10-22T09:10:00Z",
  },
  {
    id: 4,
    full_name: "Marcus Vance",
    email: "marcus.vance@example.co.uk",
    phone: "+44 7911 123456",
    country: "United Kingdom",
    treatment: "Dental Implants - All-on-4 Full Arch",
    description: "Elective comprehensive dental rehabilitation & cosmetic crown work.",
    status: "New",
    report_url: "",
    notes: JSON.stringify({
      notes_text: "Elective comprehensive dental rehabilitation.",
      estimated_cost: 4500,
      paid_amount: 0,
      currency: "USD",
      invoice_status: "UNPAID",
    }),
    assigned_hospital: "Max Super Speciality Hospital, Saket",
    estimated_revenue: 4500,
    created_at: "2026-10-23T15:40:00Z",
    updated_at: "2026-10-23T15:40:00Z",
  },
  {
    id: 5,
    full_name: "Fatima Al-Zahra",
    email: "fatima.zahra@example.com",
    phone: "+968 9123 4567",
    country: "Oman",
    treatment: "IVF - Advanced ICSI Cycle",
    description: "Seeking tertiary reproductive medicine and genetic testing.",
    status: "Completed",
    report_url: "https://example.com/reports/fatima_ivf.pdf",
    notes: JSON.stringify({
      notes_text: "Tertiary reproductive medicine and genetic testing.",
      estimated_cost: 5800,
      paid_amount: 5800,
      currency: "USD",
      invoice_status: "PAID",
      doctor_name: "Dr. Kaberi Banerjee",
    }),
    assigned_hospital: "Manipal Hospital, Dwarka, New Delhi",
    estimated_revenue: 5800,
    created_at: "2026-09-15T09:00:00Z",
    updated_at: "2026-10-15T18:00:00Z",
  },
];

export const FALLBACK_HOSPITALS: FallbackHospital[] = [
  {
    id: "hosp-001",
    name: "Medanta - The Medicity",
    slug: "medanta-gurugram",
    city: "Gurugram, NCR",
    state: "Haryana",
    country: "India",
    accreditation: "JCI & NABH Accredited",
    rating: 4.9,
    bed_count: 1250,
    established_year: 2009,
    description: "World-class super-specialty medical institute with premier robotic surgery suites.",
    image_url: "/images/medanta.png",
    specialties: ["Cardiology", "Robotic Surgery", "Neurology", "Organ Transplants"],
    contact_phone: "+91 124 4141414",
    contact_email: "international@medanta.org",
  },
  {
    id: "hosp-002",
    name: "Apollo Hospitals, Indraprastha",
    slug: "apollo-delhi",
    city: "New Delhi",
    state: "Delhi",
    country: "India",
    accreditation: "JCI & NABH Accredited",
    rating: 4.8,
    bed_count: 1000,
    established_year: 1996,
    description: "Pioneer in multi-organ transplants and comprehensive oncology.",
    image_url: "/images/apollo.png",
    specialties: ["Oncology", "Cardiology", "Organ Transplants", "Nephrology"],
    contact_phone: "+91 11 26925858",
    contact_email: "ips_delhi@apollohospitals.com",
  },
  {
    id: "hosp-003",
    name: "Fortis Memorial Research Institute",
    slug: "fortis-gurugram",
    city: "Gurugram, NCR",
    state: "Haryana",
    country: "India",
    accreditation: "JCI Accredited",
    rating: 4.9,
    bed_count: 1000,
    established_year: 2001,
    description: "Next-generation quaternary care hospital specializing in neurosurgery and orthopedics.",
    image_url: "/images/fortis.png",
    specialties: ["Orthopedics", "Neurosurgery", "Robotic Joint Replacement", "Oncology"],
    contact_phone: "+91 124 4962200",
    contact_email: "fmri@fortishealthcare.com",
  },
  {
    id: "hosp-004",
    name: "Max Super Speciality Hospital, Saket",
    slug: "max-saket",
    city: "New Delhi",
    state: "Delhi",
    country: "India",
    accreditation: "NABH & NABL Accredited",
    rating: 4.8,
    bed_count: 550,
    established_year: 2006,
    description: "Premier center for cardiovascular sciences and oncology.",
    image_url: "/images/max.png",
    specialties: ["Cardiovascular Sciences", "Surgical Oncology", "Bariatrics", "Spine"],
    contact_phone: "+91 11 26515050",
    contact_email: "international@maxhealthcare.com",
  },
  {
    id: "hosp-005",
    name: "Manipal Hospital, Dwarka",
    slug: "manipal-dwarka",
    city: "New Delhi",
    state: "Delhi",
    country: "India",
    accreditation: "NABH Accredited",
    rating: 4.8,
    bed_count: 380,
    established_year: 2018,
    description: "Quaternary multi-specialty healthcare with leading fertility and transplant medicine.",
    image_url: "/images/manipal.png",
    specialties: ["Reproductive Medicine", "Gastroenterology", "Kidney Transplant"],
    contact_phone: "+91 11 49674967",
    contact_email: "international@manipalhospitals.com",
  },
  {
    id: "hosp-006",
    name: "Narayana Institute of Cardiac Sciences",
    slug: "narayana-bangalore",
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
    accreditation: "JCI & NABH Accredited",
    rating: 4.9,
    bed_count: 1400,
    established_year: 2000,
    description: "Global epicenter for high-volume, low-cost pediatric and adult cardiac surgery.",
    image_url: "/images/narayana.png",
    specialties: ["Cardiothoracic Surgery", "Pediatric Cardiology", "Vascular Surgery"],
    contact_phone: "+91 80 71222222",
    contact_email: "info@narayanahealth.org",
  },
];

export const FALLBACK_DOCTORS: FallbackDoctor[] = [
  {
    id: "doc-001",
    hospital_id: "hosp-001",
    full_name: "Dr. Naresh Trehan",
    specialty: "Chief Cardiovascular & Cardiothoracic Surgeon",
    qualification: "MBBS, MS, Diplomate American Board of Surgery",
    experience_years: 38,
    rating: 4.98,
    consultation_fee_usd: 100,
    bio: "Pioneered minimally invasive and off-pump coronary bypass surgery with 48,000+ open heart operations.",
    avatar_url: "/images/doctors/trehan.jpg",
    is_available: true,
    hospitals: { id: "hosp-001", name: "Medanta - The Medicity", city: "Gurugram, NCR" },
  },
  {
    id: "doc-002",
    hospital_id: "hosp-003",
    full_name: "Dr. Ashok Rajgopal",
    specialty: "Chairman - Orthopedics & Joint Reconstruction",
    qualification: "MS (Ortho), MCh, FRCS (Edinburgh)",
    experience_years: 34,
    rating: 4.95,
    consultation_fee_usd: 80,
    bio: "World-renowned orthopedic surgeon having completed over 30,000 computer-navigated total knee replacements.",
    avatar_url: "/images/doctors/rajgopal.jpg",
    is_available: true,
    hospitals: { id: "hosp-003", name: "Fortis Memorial Research Institute", city: "Gurugram, NCR" },
  },
  {
    id: "doc-003",
    hospital_id: "hosp-004",
    full_name: "Dr. Harit Chaturvedi",
    specialty: "Chairman - Max Oncology Institute",
    qualification: "MBBS, MS (General Surgery), MCh (Surgical Oncology)",
    experience_years: 30,
    rating: 4.9,
    consultation_fee_usd: 90,
    bio: "Eminent surgical oncologist with expertise in complex head and neck, thoracic, and pelvic resections.",
    avatar_url: "/images/doctors/chaturvedi.jpg",
    is_available: true,
    hospitals: { id: "hosp-004", name: "Max Super Speciality Hospital, Saket", city: "New Delhi" },
  },
  {
    id: "doc-004",
    hospital_id: "hosp-005",
    full_name: "Dr. Kaberi Banerjee",
    specialty: "Director & Senior Consultant - IVF & Reproductive Medicine",
    qualification: "MBBS, MD (Obstetrics & Gynecology), MRCOG (London)",
    experience_years: 22,
    rating: 4.92,
    consultation_fee_usd: 75,
    bio: "Distinguished fertility expert specializing in recurrent IVF failure, advanced ICSI, and pre-implantation genetics.",
    avatar_url: "/images/doctors/banerjee.jpg",
    is_available: true,
    hospitals: { id: "hosp-005", name: "Manipal Hospital, Dwarka", city: "New Delhi" },
  },
];

export const FALLBACK_COORDINATORS: FallbackCoordinator[] = [
  {
    id: "coord-001",
    reference_id: "HWI-CRD-01",
    full_name: "Aman Verma",
    phone: "+91 98100 12345",
    email: "aman.verma@healwithindia.com",
    assigned_region: "Middle East & GCC",
    is_active: true,
    is_verified: true,
    assigned_at: "2026-10-18T10:35:00Z",
  },
  {
    id: "coord-002",
    reference_id: "HWI-CRD-02",
    full_name: "Pooja Sharma",
    phone: "+91 98100 54321",
    email: "pooja.sharma@healwithindia.com",
    assigned_region: "Africa & CIS Countries",
    is_active: true,
    is_verified: true,
    assigned_at: "2026-10-19T08:20:00Z",
  },
];

export const FALLBACK_TREATMENTS: FallbackTreatment[] = [
  {
    id: "treat-001",
    name: "Coronary Artery Bypass Graft (CABG)",
    slug: "coronary-bypass",
    category: "Cardiology",
    department: "Cardiac Sciences",
    description: "Minimally invasive or off-pump 3 to 4 vessel coronary revascularization.",
    duration_days: 7,
    recovery_days: 21,
    cost_usd_min: 5500,
    cost_usd_max: 9500,
  },
  {
    id: "treat-002",
    name: "Robotic Total Knee Replacement",
    slug: "robotic-knee-replacement",
    category: "Orthopedics",
    department: "Joint Reconstruction",
    description: "Computer-navigated bilateral or unilateral joint arthroplasty with titanium prosthetics.",
    duration_days: 5,
    recovery_days: 30,
    cost_usd_min: 4800,
    cost_usd_max: 7500,
  },
  {
    id: "treat-003",
    name: "CyberKnife Radiosurgery for Tumors",
    slug: "cyberknife-radiosurgery",
    category: "Oncology",
    department: "Radiation Oncology",
    description: "Sub-millimeter non-invasive robotic radiosurgery for brain and spinal neoplasms.",
    duration_days: 3,
    recovery_days: 7,
    cost_usd_min: 6500,
    cost_usd_max: 10000,
  },
  {
    id: "treat-004",
    name: "In Vitro Fertilization (IVF with ICSI)",
    slug: "ivf-icsi",
    category: "Reproductive Medicine",
    department: "Fertility",
    description: "Full ICSI cycle including blastocyst culture and pre-implantation screening.",
    duration_days: 14,
    recovery_days: 5,
    cost_usd_min: 3500,
    cost_usd_max: 6000,
  },
  {
    id: "treat-005",
    name: "Living Donor Liver Transplant",
    slug: "liver-transplant",
    category: "Organ Transplant",
    department: "Hepatobiliary Surgery",
    description: "Comprehensive donor and recipient liver transplant with post-op ICU care.",
    duration_days: 21,
    recovery_days: 60,
    cost_usd_min: 28000,
    cost_usd_max: 42000,
  },
  {
    id: "treat-006",
    name: "Kidney Transplant (Living Donor)",
    slug: "kidney-transplant",
    category: "Organ Transplant",
    department: "Renal Sciences",
    description: "Living related laparoscopic donor nephrectomy and recipient renal grafting.",
    duration_days: 12,
    recovery_days: 30,
    cost_usd_min: 12500,
    cost_usd_max: 18000,
  },
];

export const FALLBACK_EMPLOYEES: FallbackEmployee[] = [
  {
    id: 1,
    name: "Operations Administrator",
    email: "admin@healwithindia.com",
    phone: "+91 98111 00001",
    role: "super_admin",
    department: "Operations",
    country: "India",
    status: "Active",
    created_at: "2026-06-01T00:00:00Z",
  },
  {
    id: 2,
    name: "Safety Command Officer",
    email: "safety@healwithindia.com",
    phone: "+91 98111 00002",
    role: "safety_operator",
    department: "Safety & Tourist Protection",
    country: "India",
    status: "Active",
    created_at: "2026-06-01T00:00:00Z",
  },
  {
    id: 3,
    name: "Aman Verma",
    email: "aman.verma@healwithindia.com",
    phone: "+91 98100 12345",
    role: "coordinator",
    department: "Patient Coordination",
    country: "India",
    status: "Active",
    created_at: "2026-06-01T00:00:00Z",
  },
  {
    id: 4,
    name: "Neha Mathur",
    email: "neha.mathur@healwithindia.com",
    phone: "+91 98111 00004",
    role: "finance",
    department: "Financial Operations",
    country: "India",
    status: "Active",
    created_at: "2026-06-01T00:00:00Z",
  },
];

export const FALLBACK_LEADS: FallbackLead[] = [
  {
    id: 101,
    patient_name: "Tariq Al-Mansoor",
    email: "tariq.mansoor@example.com",
    phone: "+971 50 123 4567",
    country: "United Arab Emirates",
    treatment_requested: "Cardiology - Coronary Bypass",
    notes: "Requires robotic CABG at Medanta.",
    source: "website",
    status: "Treatment Started",
    assigned_coordinator_id: "coord-001",
    created_at: "2026-10-18T10:30:00Z",
    official_coordinators: { id: "coord-001", full_name: "Aman Verma", phone: "+91 98100 12345" },
  },
  {
    id: 102,
    patient_name: "Grace Adebayo",
    email: "grace.adebayo@example.com",
    phone: "+234 803 456 7890",
    country: "Nigeria",
    treatment_requested: "Orthopedics - Knee Replacement",
    notes: "Severe bilateral osteoarthritis.",
    source: "referral",
    status: "Hospital Assigned",
    assigned_coordinator_id: "coord-002",
    created_at: "2026-10-19T08:15:00Z",
    official_coordinators: { id: "coord-002", full_name: "Pooja Sharma", phone: "+91 98100 54321" },
  },
  {
    id: 103,
    patient_name: "David Kimani",
    email: "david.kimani@example.co.ke",
    phone: "+254 712 345678",
    country: "Kenya",
    treatment_requested: "Neurosurgery - Spinal Fusion",
    notes: "L4-L5 lumbar disc herniation requiring decompression.",
    source: "whatsapp",
    status: "New",
    assigned_coordinator_id: null,
    created_at: "2026-11-01T14:10:00Z",
    official_coordinators: null,
  },
];

export const FALLBACK_INVOICES: FallbackInvoice[] = [
  {
    id: 1,
    patient_id: 1,
    invoice_number: "INV-891044",
    amount_usd: 9500,
    tax_usd: 0,
    total_usd: 9500,
    due_date: "2026-10-25",
    status: "paid",
    created_at: "2026-10-18T11:00:00Z",
    payments: [
      {
        id: 1,
        invoice_id: 1,
        patient_id: 1,
        amount_usd: 9500,
        payment_method: "wire_transfer",
        transaction_ref: "WT-UAE-9921448",
        status: "completed",
        created_at: "2026-10-19T14:00:00Z",
      },
    ],
  },
  {
    id: 2,
    patient_id: 2,
    invoice_number: "INV-891045",
    amount_usd: 7200,
    tax_usd: 0,
    total_usd: 7200,
    due_date: "2026-11-10",
    status: "partially_paid",
    created_at: "2026-10-19T09:00:00Z",
    payments: [
      {
        id: 2,
        invoice_id: 2,
        patient_id: 2,
        amount_usd: 3600,
        payment_method: "credit_card",
        transaction_ref: "CC-NG-5521098",
        status: "completed",
        created_at: "2026-10-20T10:00:00Z",
      },
    ],
  },
];

export const FALLBACK_QUOTES: FallbackQuote[] = [
  {
    id: 1,
    patient_id: 1,
    treatment_id: "treat-001",
    hospital_id: "hosp-001",
    amount_usd: 9500,
    status: "accepted",
    validity_date: "2026-11-18",
    created_at: "2026-10-18T10:45:00Z",
  },
  {
    id: 2,
    patient_id: 3,
    treatment_id: "treat-003",
    hospital_id: "hosp-002",
    amount_usd: 8800,
    status: "sent",
    validity_date: "2026-11-21",
    created_at: "2026-10-21T13:00:00Z",
  },
];

export interface FallbackChecklistItem {
  item_type: string;
  is_completed: boolean;
  completed_at: string | null;
  notes?: string;
}

export const FALLBACK_CHECKLIST: FallbackChecklistItem[] = [
  { item_type: "passport_visa", is_completed: true, completed_at: "2026-10-15T10:00:00Z", notes: "Medical Visa Granted" },
  { item_type: "hospital_confirmed", is_completed: true, completed_at: "2026-10-16T12:00:00Z", notes: "Medanta - The Medicity Confirmed" },
  { item_type: "flight_booked", is_completed: true, completed_at: "2026-10-17T09:00:00Z", notes: "Emirates EK-512" },
  { item_type: "hotel_reserved", is_completed: true, completed_at: "2026-10-17T11:00:00Z", notes: "The Oberoi, New Delhi" },
  { item_type: "coordinator_assigned", is_completed: true, completed_at: "2026-10-18T10:35:00Z", notes: "Aman Verma (+91 98100 12345)" },
  { item_type: "sim_card_received", is_completed: true, completed_at: "2026-10-19T08:00:00Z", notes: "Airtel 5G Tourist e-SIM Active" },
  { item_type: "arrival_reported", is_completed: true, completed_at: "2026-10-19T10:15:00Z", notes: "Arrived at IGI Terminal 3" },
  { item_type: "first_consultation", is_completed: true, completed_at: "2026-10-20T11:00:00Z", notes: "Consulted Dr. Naresh Trehan" },
  { item_type: "treatment_scheduled", is_completed: true, completed_at: "2026-10-21T07:00:00Z", notes: "Procedure scheduled for Oct 22" },
];

export const FALLBACK_CHECKINS: FallbackCheckIn[] = [
  {
    id: "chk-001",
    patient_id: 1,
    status: "safe",
    location: "Medanta Hospital, Ward 4B",
    notes: "Pre-operative evaluation completed, feeling comfortable.",
    check_in_time: "2026-10-21T09:00:00Z",
    created_at: "2026-10-21T09:00:00Z",
    patients: { id: 1, full_name: "Tariq Al-Mansoor" },
  },
  {
    id: "chk-002",
    patient_id: 1,
    status: "safe",
    location: "The Oberoi, New Delhi",
    notes: "Checked into hotel after smooth airport arrival escort.",
    check_in_time: "2026-10-19T12:00:00Z",
    created_at: "2026-10-19T12:00:00Z",
    patients: { id: 1, full_name: "Tariq Al-Mansoor" },
  },
  {
    id: "chk-003",
    patient_id: 2,
    status: "safe",
    location: "Crowne Plaza, Gurugram",
    notes: "Arrived safely in India. Coordinator Pooja met us at airport.",
    check_in_time: "2026-10-20T11:30:00Z",
    created_at: "2026-10-20T11:30:00Z",
    patients: { id: 2, full_name: "Grace Adebayo" },
  },
];

export const FALLBACK_SAFETY_CASES: FallbackSafetyCase[] = [
  {
    id: "case-001",
    case_number: "CASE-2026-001",
    patient_id: 1,
    category: "coordination",
    priority: "medium",
    status: "resolved",
    description: "Airport escort arrival delay due to flight reschedule. Resolved with coordinator dispatch.",
    assigned_to: "Aman Verma",
    created_at: "2026-10-19T07:00:00Z",
    updated_at: "2026-10-19T08:30:00Z",
    patients: { id: 1, full_name: "Tariq Al-Mansoor", country: "United Arab Emirates" },
  },
];

export const FALLBACK_MONITORING = {
  active_monitored_journeys: 3,
  risk_levels: {
    normal: 2,
    watch: 1,
    elevated: 0,
    high: 0,
    critical: 0,
  },
  open_incidents: 0,
  unacknowledged_incidents: 0,
  overdue_check_ins: 0,
  response_delays: 0,
};

/**
 * Singleton Resilient In-Memory Database Store
 * Maintains full reactivity, state updates, and relationship queries.
 */
class ResilientDatabaseStore {
  private patients: FallbackPatient[] = JSON.parse(JSON.stringify(FALLBACK_PATIENTS));
  private hospitals: FallbackHospital[] = JSON.parse(JSON.stringify(FALLBACK_HOSPITALS));
  private doctors: FallbackDoctor[] = JSON.parse(JSON.stringify(FALLBACK_DOCTORS));
  private treatments: FallbackTreatment[] = JSON.parse(JSON.stringify(FALLBACK_TREATMENTS));
  private coordinators: FallbackCoordinator[] = JSON.parse(JSON.stringify(FALLBACK_COORDINATORS));
  private employees: FallbackEmployee[] = JSON.parse(JSON.stringify(FALLBACK_EMPLOYEES));
  private leads: FallbackLead[] = JSON.parse(JSON.stringify(FALLBACK_LEADS));
  private invoices: FallbackInvoice[] = JSON.parse(JSON.stringify(FALLBACK_INVOICES));
  private quotes: FallbackQuote[] = JSON.parse(JSON.stringify(FALLBACK_QUOTES));
  private checkIns: FallbackCheckIn[] = JSON.parse(JSON.stringify(FALLBACK_CHECKINS));
  private safetyCases: FallbackSafetyCase[] = JSON.parse(JSON.stringify(FALLBACK_SAFETY_CASES));
  private checklists: Record<number, FallbackChecklistItem[]> = {
    1: JSON.parse(JSON.stringify(FALLBACK_CHECKLIST)),
    2: JSON.parse(JSON.stringify(FALLBACK_CHECKLIST)),
  };
  private assignments: Record<number, any> = {
    1: {
      doctors: [
        {
          id: "assign-doc-1",
          patient_id: 1,
          doctor_id: "doc-001",
          role: "primary_physician",
          status: "active",
          is_lead_doctor: true,
          consultation_date: "2026-10-20",
          consultation_notes: "Evaluated for robotic coronary artery bypass.",
          assigned_at: "2026-10-18T10:35:00Z",
          doctor: FALLBACK_DOCTORS[0],
        },
      ],
      care_team: [
        {
          id: "assign-ct-1",
          patient_id: 1,
          staff_name: "Sister Mary Abraham",
          staff_role: "lead_nurse",
          phone: "+91 98100 88771",
          email: "mary.abraham@medanta.org",
          shift: "morning",
          status: "active",
        },
        {
          id: "assign-ct-2",
          patient_id: 1,
          staff_name: "Zaid Al-Harbi",
          staff_role: "medical_interpreter",
          phone: "+91 98100 33441",
          email: "zaid.interpreter@healwithindia.com",
          shift: "on_call",
          status: "active",
        },
      ],
      treatments: [
        {
          id: "assign-tr-1",
          patient_id: 1,
          treatment_id: "treat-001",
          scheduled_start_date: "2026-10-22",
          status: "in_progress",
          is_primary: true,
          treatment: FALLBACK_TREATMENTS[0],
        },
      ],
      hospital_stay: {
        id: "assign-hosp-1",
        patient_id: 1,
        hospital_id: "hosp-001",
        room_number: "Suite 412",
        admission_date: "2026-10-21",
        discharge_date: "2026-10-28",
        status: "active",
        hospital: FALLBACK_HOSPITALS[0],
      },
      escort: {
        id: "assign-escort-1",
        patient_id: 1,
        escort_name: "Vikram Malhotra",
        phone: "+91 98100 77112",
        service_type: "airport_pickup",
        status: "completed",
      },
      active_lead_doctor: FALLBACK_DOCTORS[0],
    },
  };

  // ── Patients ──────────────────────────────────────────────
  getPatients(): FallbackPatient[] {
    return this.patients;
  }

  getPatientById(id: number): FallbackPatient | null {
    return this.patients.find((p) => p.id === id) || null;
  }

  getPatientByEmail(email: string): FallbackPatient | null {
    if (!email) return null;
    const clean = email.toLowerCase().trim();
    return (
      this.patients.find(
        (p) => p.email && p.email.toLowerCase().trim() === clean
      ) || null
    );
  }

  createPatient(data: Partial<FallbackPatient>): FallbackPatient {
    const newId =
      this.patients.length > 0
        ? Math.max(...this.patients.map((p) => p.id)) + 1
        : 1;
    const now = new Date().toISOString();

    const newPatient: FallbackPatient = {
      id: newId,
      full_name: data.full_name || "New Patient",
      email: data.email || `patient${newId}@example.com`,
      phone: data.phone || "",
      country: data.country || "International",
      treatment: data.treatment || "General Consultation",
      description: data.description || "",
      status: data.status || "New",
      report_url: data.report_url || "",
      notes: data.notes || JSON.stringify({}),
      assigned_hospital: data.assigned_hospital || "",
      estimated_revenue: data.estimated_revenue || 0,
      created_at: now,
      updated_at: now,
    };

    this.patients.unshift(newPatient);

    // Also register lead
    this.createLead({
      patient_name: newPatient.full_name,
      email: newPatient.email,
      phone: newPatient.phone,
      country: newPatient.country,
      treatment_requested: newPatient.treatment,
      notes: newPatient.description,
      source: "crm_admin",
      status: "New",
    });

    return newPatient;
  }

  updatePatient(id: number, updates: Partial<FallbackPatient>): FallbackPatient | null {
    const idx = this.patients.findIndex((p) => p.id === id);
    if (idx === -1) return null;

    this.patients[idx] = {
      ...this.patients[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    return this.patients[idx];
  }

  updatePatientStatus(id: number, status: string): FallbackPatient | null {
    return this.updatePatient(id, { status });
  }

  // ── Hospitals ─────────────────────────────────────────────
  getHospitals(): FallbackHospital[] {
    return this.hospitals;
  }

  addHospital(data: Partial<FallbackHospital>): FallbackHospital {
    const id = `hosp-${Date.now().toString().slice(-4)}`;
    const newHospital: FallbackHospital = {
      id,
      name: data.name || "New Hospital",
      slug: data.slug || `hospital-${Date.now()}`,
      city: data.city || "New Delhi",
      state: data.state || "Delhi",
      country: data.country || "India",
      accreditation: data.accreditation || "NABH Accredited",
      rating: data.rating || 4.8,
      bed_count: data.bed_count || 500,
      established_year: data.established_year || 2015,
      description: data.description || "Leading healthcare institution.",
      image_url: data.image_url || "/images/medanta.png",
      specialties: data.specialties || ["Multi-Specialty"],
      contact_phone: data.contact_phone || "+91 11 0000000",
      contact_email: data.contact_email || "info@hospital.in",
    };
    this.hospitals.unshift(newHospital);
    return newHospital;
  }

  // ── Doctors ───────────────────────────────────────────────
  getDoctors(): FallbackDoctor[] {
    return this.doctors;
  }

  addDoctor(data: Partial<FallbackDoctor>): FallbackDoctor {
    const id = `doc-${Date.now().toString().slice(-4)}`;
    const hosp = this.hospitals.find((h) => h.id === data.hospital_id) || this.hospitals[0];

    const newDoctor: FallbackDoctor = {
      id,
      hospital_id: hosp.id,
      full_name: data.full_name || "New Specialist",
      specialty: data.specialty || "General Surgery",
      qualification: data.qualification || "MBBS, MS",
      experience_years: data.experience_years || 10,
      rating: data.rating || 4.9,
      consultation_fee_usd: data.consultation_fee_usd || 60,
      bio: data.bio || "Renowned specialist providing international patient care.",
      avatar_url: data.avatar_url || "/images/doctors/trehan.jpg",
      is_available: true,
      hospitals: { id: hosp.id, name: hosp.name, city: hosp.city },
    };
    this.doctors.unshift(newDoctor);
    return newDoctor;
  }

  // ── Treatments ────────────────────────────────────────────
  getTreatments(): FallbackTreatment[] {
    return this.treatments;
  }

  addTreatment(data: Partial<FallbackTreatment>): FallbackTreatment {
    const id = `treat-${Date.now().toString().slice(-4)}`;
    const newTreatment: FallbackTreatment = {
      id,
      name: data.name || "New Treatment",
      slug: data.slug || `treatment-${Date.now()}`,
      category: data.category || "General Surgery",
      department: data.department || "Surgical Sciences",
      description: data.description || "Advanced medical procedure.",
      duration_days: data.duration_days || 7,
      recovery_days: data.recovery_days || 14,
      cost_usd_min: data.cost_usd_min || 3000,
      cost_usd_max: data.cost_usd_max || 8000,
      treatment_packages: [],
    };
    this.treatments.unshift(newTreatment);
    return newTreatment;
  }

  // ── Coordinators ──────────────────────────────────────────
  getCoordinators(): FallbackCoordinator[] {
    return this.coordinators;
  }

  addCoordinator(data: Partial<FallbackCoordinator>): FallbackCoordinator {
    const id = `coord-${Date.now().toString().slice(-4)}`;
    const newCoord: FallbackCoordinator = {
      id,
      reference_id: `HWI-CRD-${this.coordinators.length + 1}`,
      full_name: data.full_name || "Medical Coordinator",
      phone: data.phone || "+91 98000 00000",
      email: data.email || `coordinator${this.coordinators.length + 1}@healwithindia.com`,
      assigned_region: data.assigned_region || "International",
      is_active: true,
      is_verified: true,
      assigned_at: new Date().toISOString(),
    };
    this.coordinators.unshift(newCoord);
    return newCoord;
  }

  // ── Employees ─────────────────────────────────────────────
  getEmployees(): FallbackEmployee[] {
    return this.employees;
  }

  addEmployee(data: Partial<FallbackEmployee>): FallbackEmployee {
    const newId =
      this.employees.length > 0
        ? Math.max(...this.employees.map((e) => e.id)) + 1
        : 1;

    const newEmp: FallbackEmployee = {
      id: newId,
      name: data.name || "Staff Member",
      email: data.email || `staff${newId}@healwithindia.com`,
      phone: data.phone || "+91 98000 00000",
      role: data.role || "coordinator",
      department: data.department || "Operations",
      country: data.country || "India",
      status: "Active",
      created_at: new Date().toISOString(),
    };
    this.employees.unshift(newEmp);
    return newEmp;
  }

  // ── Leads ─────────────────────────────────────────────────
  getLeads(): FallbackLead[] {
    return this.leads;
  }

  createLead(data: Partial<FallbackLead>): FallbackLead {
    const newId =
      this.leads.length > 0
        ? Math.max(...this.leads.map((l) => l.id)) + 1
        : 101;

    const newLead: FallbackLead = {
      id: newId,
      patient_name: data.patient_name || "Inquiry Lead",
      email: data.email || `lead${newId}@example.com`,
      phone: data.phone || "",
      country: data.country || "International",
      treatment_requested: data.treatment_requested || "General Inquiry",
      notes: data.notes || "",
      source: data.source || "website",
      status: data.status || "New",
      assigned_coordinator_id: data.assigned_coordinator_id || null,
      created_at: new Date().toISOString(),
      official_coordinators: null,
    };
    this.leads.unshift(newLead);
    return newLead;
  }

  // ── Invoices & Quotes ─────────────────────────────────────
  getInvoices(patientId?: number): FallbackInvoice[] {
    if (patientId) {
      return this.invoices.filter((i) => i.patient_id === patientId);
    }
    return this.invoices;
  }

  createInvoice(data: Partial<FallbackInvoice>): FallbackInvoice {
    const newId =
      this.invoices.length > 0
        ? Math.max(...this.invoices.map((i) => i.id)) + 1
        : 1;

    const amount = Number(data.amount_usd) || 5000;
    const tax = Number(data.tax_usd) || 0;

    const newInv: FallbackInvoice = {
      id: newId,
      patient_id: data.patient_id || 1,
      invoice_number: `INV-${Date.now().toString().slice(-6)}`,
      amount_usd: amount,
      tax_usd: tax,
      total_usd: amount + tax,
      due_date:
        data.due_date ||
        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: "unpaid",
      created_at: new Date().toISOString(),
      payments: [],
    };
    this.invoices.unshift(newInv);
    return newInv;
  }

  recordPayment(invoiceId: number, payment: Partial<FallbackPayment>): FallbackPayment {
    const inv = this.invoices.find((i) => i.id === invoiceId);
    const newPaymentId = Date.now();

    const newPayment: FallbackPayment = {
      id: newPaymentId,
      invoice_id: invoiceId,
      patient_id: inv ? inv.patient_id : 1,
      amount_usd: Number(payment.amount_usd) || (inv ? inv.total_usd : 1000),
      payment_method: payment.payment_method || "credit_card",
      transaction_ref: payment.transaction_ref || `TX-${Date.now()}`,
      status: "completed",
      created_at: new Date().toISOString(),
    };

    if (inv) {
      if (!inv.payments) inv.payments = [];
      inv.payments.push(newPayment);
      inv.status = "paid";
    }

    return newPayment;
  }

  getQuotes(patientId?: number): FallbackQuote[] {
    if (patientId) {
      return this.quotes.filter((q) => q.patient_id === patientId);
    }
    return this.quotes;
  }

  createQuote(data: Partial<FallbackQuote>): FallbackQuote {
    const newId =
      this.quotes.length > 0
        ? Math.max(...this.quotes.map((q) => q.id)) + 1
        : 1;

    const newQuote: FallbackQuote = {
      id: newId,
      patient_id: data.patient_id || 1,
      treatment_id: data.treatment_id,
      hospital_id: data.hospital_id,
      amount_usd: Number(data.amount_usd) || 7500,
      status: "sent",
      validity_date:
        data.validity_date ||
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      created_at: new Date().toISOString(),
    };
    this.quotes.unshift(newQuote);
    return newQuote;
  }

  // ── Assignments ───────────────────────────────────────────
  getAssignments(patientId: number): any {
    if (!this.assignments[patientId]) {
      return {
        doctors: [],
        care_team: [],
        treatments: [],
        hospital_stay: null,
        escort: null,
        active_lead_doctor: null,
      };
    }
    return this.assignments[patientId];
  }

  saveAssignment(patientId: number, assignmentType: string, payload: any): any {
    if (!this.assignments[patientId]) {
      this.assignments[patientId] = {
        doctors: [],
        care_team: [],
        treatments: [],
        hospital_stay: null,
        escort: null,
        active_lead_doctor: null,
      };
    }

    const current = this.assignments[patientId];
    const now = new Date().toISOString();

    if (assignmentType === "doctor") {
      const doc = this.doctors.find((d) => d.id === payload.doctor_id) || this.doctors[0];
      const entry = {
        id: `assign-doc-${Date.now()}`,
        patient_id: patientId,
        doctor_id: payload.doctor_id,
        role: payload.role || "attending_surgeon",
        status: "active",
        is_lead_doctor: payload.is_lead_doctor !== false,
        consultation_date: payload.consultation_date || now.split("T")[0],
        consultation_notes: payload.consultation_notes || "",
        treatment_goals: payload.treatment_goals || "",
        assigned_at: now,
        doctor: doc,
      };
      if (entry.is_lead_doctor) {
        current.active_lead_doctor = doc;
      }
      current.doctors.unshift(entry);
      return entry;
    }

    if (assignmentType === "care_team") {
      const entry = {
        id: `assign-ct-${Date.now()}`,
        patient_id: patientId,
        staff_name: payload.staff_name || "Specialist Nurse",
        staff_role: payload.staff_role || "lead_nurse",
        phone: payload.phone || "+91 98000 00000",
        email: payload.email || "care@healwithindia.com",
        shift: payload.shift || "morning",
        status: "active",
      };
      current.care_team.unshift(entry);
      return entry;
    }

    if (assignmentType === "treatment") {
      const treat = this.treatments.find((t) => t.id === payload.treatment_id) || this.treatments[0];
      const entry = {
        id: `assign-tr-${Date.now()}`,
        patient_id: patientId,
        treatment_id: payload.treatment_id,
        scheduled_start_date: payload.scheduled_start_date || now.split("T")[0],
        status: "scheduled",
        is_primary: payload.is_primary !== false,
        treatment: treat,
      };
      current.treatments.unshift(entry);
      return entry;
    }

    if (assignmentType === "hospital_bed") {
      const hosp = this.hospitals.find((h) => h.id === payload.hospital_id) || this.hospitals[0];
      const entry = {
        id: `assign-hosp-${Date.now()}`,
        patient_id: patientId,
        hospital_id: payload.hospital_id,
        room_number: payload.room_number || "Room 101",
        admission_date: payload.admission_date || now.split("T")[0],
        discharge_date: payload.discharge_date,
        status: "active",
        hospital: hosp,
      };
      current.hospital_stay = entry;
      return entry;
    }

    return null;
  }

  // ── Safety & Monitoring ───────────────────────────────────
  getCheckIns(patientId?: number): FallbackCheckIn[] {
    if (patientId) {
      return this.checkIns.filter((c) => c.patient_id === patientId);
    }
    return this.checkIns;
  }

  addCheckIn(patientId: number, status: "safe" | "assistance_requested" | "incident_reported", location?: string, notes?: string): FallbackCheckIn {
    const patient = this.getPatientById(patientId);
    const newCheckIn: FallbackCheckIn = {
      id: `chk-${Date.now()}`,
      patient_id: patientId,
      status,
      location: location || "Patient Location",
      notes: notes || "",
      check_in_time: new Date().toISOString(),
      created_at: new Date().toISOString(),
      patients: { id: patientId, full_name: patient ? patient.full_name : "Patient" },
    };
    this.checkIns.unshift(newCheckIn);
    return newCheckIn;
  }

  getChecklist(patientId: number) {
    if (!this.checklists[patientId]) {
      this.checklists[patientId] = JSON.parse(JSON.stringify(FALLBACK_CHECKLIST));
    }
    return this.checklists[patientId];
  }

  toggleChecklist(patientId: number, itemType: string, isCompleted: boolean) {
    const items = this.getChecklist(patientId);
    const target = items.find((i) => i.item_type === itemType);
    if (target) {
      target.is_completed = isCompleted;
      target.completed_at = isCompleted ? new Date().toISOString() : null;
    } else {
      items.push({
        item_type: itemType,
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
        notes: "",
      });
    }
    return items;
  }

  getSafetyCases(patientId?: number): FallbackSafetyCase[] {
    if (patientId) {
      return this.safetyCases.filter((c) => c.patient_id === patientId);
    }
    return this.safetyCases;
  }

  createSafetyCase(data: Partial<FallbackSafetyCase>): FallbackSafetyCase {
    const newCase: FallbackSafetyCase = {
      id: `case-${Date.now()}`,
      case_number: `CASE-2026-${Date.now().toString().slice(-4)}`,
      patient_id: data.patient_id || 1,
      category: data.category || "emergency",
      priority: data.priority || "high",
      status: "open",
      description: data.description || "Urgent assistance requested by patient.",
      assigned_to: data.assigned_to || "Aman Verma",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      patients: {
        id: data.patient_id || 1,
        full_name: "Tariq Al-Mansoor",
        country: "United Arab Emirates",
      },
    };
    this.safetyCases.unshift(newCase);
    return newCase;
  }

  getMonitoringData() {
    return {
      overview: {
        ...FALLBACK_MONITORING,
        active_monitored_journeys: this.patients.length,
        open_incidents: this.safetyCases.filter((c) => c.status === "open").length,
      },
      signals: [
        {
          id: "sig-001",
          patient_id: 1,
          type: "flight_arrival",
          severity: "low",
          message: "Flight EK-512 landed on time. Tourist transit verified.",
          detected_at: new Date().toISOString(),
          status: "active",
        },
      ],
      risk_assessments: [
        {
          id: "risk-001",
          patient_id: 1,
          overall_risk: "normal",
          evaluated_at: new Date().toISOString(),
        },
      ],
      cases: this.safetyCases,
      evaluations: [],
      pagination: {
        page: 1,
        page_size: 20,
        total_signals: 1,
        total_risk_assessments: 1,
        total_cases: this.safetyCases.length,
        has_more_signals: false,
        has_more_risk_assessments: false,
        has_more_cases: false,
      },
    };
  }

  getAuditLogs() {
    return [
      {
        id: "log-1",
        action: "PATIENT_CREATED",
        actor: "admin@healwithindia.com",
        details: "Created patient record for Tariq Al-Mansoor",
        timestamp: "2026-10-18T10:30:00Z",
      },
      {
        id: "log-2",
        action: "PROTECTION_ACTIVATED",
        actor: "safety@healwithindia.com",
        details: "Smart Tourist Protection activated for Patient #1",
        timestamp: "2026-10-18T10:35:00Z",
      },
      {
        id: "log-3",
        action: "DOCTOR_ASSIGNED",
        actor: "admin@healwithindia.com",
        details: "Dr. Naresh Trehan assigned as Lead Surgeon for Patient #1",
        timestamp: "2026-10-18T11:00:00Z",
      },
      {
        id: "log-4",
        action: "CHECKIN_RECORDED",
        actor: "tariq.mansoor@example.com",
        details: "Safe arrival check-in confirmed via GPS beacon",
        timestamp: "2026-10-19T10:15:00Z",
      },
    ];
  }
}

// Global Singleton to ensure memory persistence across hot reloads in dev & production
const globalStoreKey = Symbol.for("hwi.resilient_database");
const globalObj = globalThis as unknown as { [globalStoreKey]?: ResilientDatabaseStore };

if (!globalObj[globalStoreKey]) {
  globalObj[globalStoreKey] = new ResilientDatabaseStore();
}

export const ResilientDatabase = globalObj[globalStoreKey]!;
