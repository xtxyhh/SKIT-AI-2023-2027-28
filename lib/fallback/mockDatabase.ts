/**
 * Resilient In-Memory & Fallback Database for HealWithIndia
 * Used when remote cloud Supabase instance is unreachable, paused, or in local evaluation mode.
 */

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
      estimated_cost: 9500,
      paid_amount: 9500,
      currency: "USD",
      invoice_status: "PAID",
      flight_number: "EK-512",
      hotel_name: "The Oberoi, New Delhi",
      doctor_name: "Dr. Naresh Trehan",
      treatment_plan_summary: "4-Vessel CABG with post-op cardiac rehabilitation.",
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
      estimated_cost: 7200,
      paid_amount: 3600,
      currency: "USD",
      invoice_status: "PARTIALLY_PAID",
      flight_number: "ET-688",
      doctor_name: "Dr. Ashok Rajgopal",
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
      estimated_cost: 8800,
      paid_amount: 0,
      currency: "USD",
      invoice_status: "UNPAID",
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

export const FALLBACK_HOSPITALS = [
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
  },
];

export const FALLBACK_DOCTORS = [
  {
    id: "doc-001",
    full_name: "Dr. Naresh Trehan",
    specialty: "Chief Cardiovascular & Cardiothoracic Surgeon",
    qualification: "MBBS, MS, Diplomate American Board of Surgery",
    experience_years: 38,
    rating: 4.98,
    consultation_fee_usd: 100,
    hospital_id: "hosp-001",
    is_available: true,
  },
  {
    id: "doc-002",
    full_name: "Dr. Ashok Rajgopal",
    specialty: "Chairman - Orthopedics & Joint Reconstruction",
    qualification: "MS (Ortho), MCh, FRCS (Edinburgh)",
    experience_years: 34,
    rating: 4.95,
    consultation_fee_usd: 80,
    hospital_id: "hosp-003",
    is_available: true,
  },
  {
    id: "doc-003",
    full_name: "Dr. Harit Chaturvedi",
    specialty: "Chairman - Max Oncology Institute",
    qualification: "MBBS, MS (General Surgery), MCh (Surgical Oncology)",
    experience_years: 30,
    rating: 4.9,
    consultation_fee_usd: 90,
    hospital_id: "hosp-004",
    is_available: true,
  },
];

export const FALLBACK_COORDINATORS = [
  {
    id: "coord-001",
    reference_id: "HWI-CRD-01",
    full_name: "Aman Verma",
    phone: "+91 98100 12345",
    email: "aman.verma@healwithindia.com",
    assigned_region: "Middle East & GCC",
    is_active: true,
  },
  {
    id: "coord-002",
    reference_id: "HWI-CRD-02",
    full_name: "Pooja Sharma",
    phone: "+91 98100 54321",
    email: "pooja.sharma@healwithindia.com",
    assigned_region: "Africa & CIS Countries",
    is_active: true,
  },
];
