-- ==============================================================================
-- Migration: 013_patient_assigned_relational_tables.sql
-- Description: Relational tables linking patients to assigned doctors, care teams,
--              treatments, hospital rooms/beds, and travel escorts.
-- Architecture: PostgreSQL + Supabase with RLS policies, indexing & integrity constraints.
-- ==============================================================================

-- 1. PATIENT-DOCTOR ASSIGNMENTS TABLE (Relational Junction)
-- Links a patient to one or more assigned doctors with designated clinical roles
CREATE TABLE IF NOT EXISTS patient_doctor_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'primary_physician' CHECK (
    role IN (
      'primary_physician',
      'attending_surgeon',
      'consulting_specialist',
      'anesthesiologist',
      'rehabilitation_specialist'
    )
  ),
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'completed', 'transferred', 'revoked')
  ),
  is_lead_doctor BOOLEAN DEFAULT FALSE,
  consultation_date TIMESTAMP WITH TIME ZONE,
  consultation_notes TEXT,
  treatment_goals TEXT,
  assigned_by TEXT DEFAULT 'admin',
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. PATIENT CARE TEAM & INTERPRETER ASSIGNMENTS TABLE
-- Links patients to multidisciplinary hospital support staff (translators, nurse leads, dietitians)
CREATE TABLE IF NOT EXISTS patient_care_team_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  staff_name TEXT NOT NULL,
  staff_role TEXT NOT NULL CHECK (
    staff_role IN (
      'lead_nurse',
      'medical_interpreter',
      'patient_advocate',
      'dietitian',
      'physiotherapist',
      'logistics_coordinator'
    )
  ),
  phone TEXT,
  email TEXT,
  languages_spoken TEXT[] DEFAULT ARRAY['English', 'Hindi'],
  shift TEXT CHECK (
    shift IN ('morning', 'evening', 'night', 'rotational', 'on_call')
  ) DEFAULT 'rotational',
  is_primary_contact BOOLEAN DEFAULT FALSE,
  emergency_reachable BOOLEAN DEFAULT TRUE,
  special_instructions TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. PATIENT TREATMENT ASSIGNMENTS TABLE
-- Links patients to specific scheduled treatments, packages, supervising doctors & hospitals
CREATE TABLE IF NOT EXISTS patient_treatment_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  treatment_id UUID NOT NULL REFERENCES treatments(id) ON DELETE CASCADE,
  package_id UUID REFERENCES treatment_packages(id) ON DELETE SET NULL,
  supervising_doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
  stage TEXT NOT NULL DEFAULT 'scheduled' CHECK (
    stage IN (
      'scheduled',
      'pre_op',
      'in_procedure',
      'post_op',
      'rehabilitation',
      'completed',
      'deferred'
    )
  ),
  scheduled_date DATE,
  estimated_duration_days INTEGER DEFAULT 7,
  actual_procedure_date DATE,
  discharge_date DATE,
  pre_op_requirements TEXT,
  post_op_guidelines TEXT,
  discharge_summary_url TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. PATIENT HOSPITAL & BED ASSIGNMENTS TABLE
-- Links patients to hospitals, admission departments, wards, and designated room/bed numbers
CREATE TABLE IF NOT EXISTS patient_hospital_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  ward_department TEXT NOT NULL DEFAULT 'International Patient Wing',
  room_number TEXT,
  bed_number TEXT,
  room_type TEXT NOT NULL DEFAULT 'private_deluxe' CHECK (
    room_type IN ('general', 'semi_private', 'private_deluxe', 'icu', 'suite')
  ),
  admission_date TIMESTAMP WITH TIME ZONE,
  expected_discharge_date TIMESTAMP WITH TIME ZONE,
  actual_discharge_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (
    status IN ('reserved', 'admitted', 'in_surgery', 'recovering', 'discharged', 'cancelled')
  ),
  nurse_station_contact TEXT,
  special_dietary_needs TEXT,
  emergency_notes TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. PATIENT ESCORT & TRAVEL LIAISON ASSIGNMENTS TABLE
-- Links patients to designated airport escorts, drivers, and local medical travel facilitators
CREATE TABLE IF NOT EXISTS patient_escort_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  escort_name TEXT NOT NULL,
  escort_role TEXT NOT NULL DEFAULT 'airport_greeter' CHECK (
    escort_role IN ('airport_greeter', 'chauffeur', 'medical_escort', 'local_guide')
  ),
  phone TEXT NOT NULL,
  vehicle_type TEXT DEFAULT 'Sedan (AC)',
  vehicle_number TEXT,
  meeting_location TEXT DEFAULT 'IGI Airport Terminal 3, Arrival Gate 4',
  scheduled_pickup_time TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (
    status IN ('assigned', 'en_route', 'waiting', 'completed', 'cancelled')
  ),
  notes TEXT,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE & SCALABILITY
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_pda_patient_id ON patient_doctor_assignments(patient_id);
CREATE INDEX IF NOT EXISTS idx_pda_doctor_id ON patient_doctor_assignments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_pda_status ON patient_doctor_assignments(status);
CREATE INDEX IF NOT EXISTS idx_pda_patient_active ON patient_doctor_assignments(patient_id, status);

CREATE INDEX IF NOT EXISTS idx_pcta_patient_id ON patient_care_team_assignments(patient_id);
CREATE INDEX IF NOT EXISTS idx_pcta_staff_role ON patient_care_team_assignments(staff_role);

CREATE INDEX IF NOT EXISTS idx_pta_patient_id ON patient_treatment_assignments(patient_id);
CREATE INDEX IF NOT EXISTS idx_pta_treatment_id ON patient_treatment_assignments(treatment_id);
CREATE INDEX IF NOT EXISTS idx_pta_stage ON patient_treatment_assignments(stage);

CREATE INDEX IF NOT EXISTS idx_pha_patient_id ON patient_hospital_assignments(patient_id);
CREATE INDEX IF NOT EXISTS idx_pha_hospital_id ON patient_hospital_assignments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_pha_status ON patient_hospital_assignments(status);

CREATE INDEX IF NOT EXISTS idx_pea_patient_id ON patient_escort_assignments(patient_id);
CREATE INDEX IF NOT EXISTS idx_pea_status ON patient_escort_assignments(status);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE patient_doctor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_care_team_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_treatment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_hospital_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_escort_assignments ENABLE ROW LEVEL SECURITY;

-- Service Role (Admins / Backend Services) full CRUD policies
CREATE POLICY "Service role full access patient_doctor_assignments"
  ON patient_doctor_assignments FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access patient_care_team_assignments"
  ON patient_care_team_assignments FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access patient_treatment_assignments"
  ON patient_treatment_assignments FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access patient_hospital_assignments"
  ON patient_hospital_assignments FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access patient_escort_assignments"
  ON patient_escort_assignments FOR ALL
  USING (auth.role() = 'service_role');

-- Patient View Ownership Policies (Ensures patient can only view their own assignments)
CREATE POLICY "Patients view own doctor assignments"
  ON patient_doctor_assignments FOR SELECT
  USING (verify_patient_ownership(patient_id));

CREATE POLICY "Patients view own care team assignments"
  ON patient_care_team_assignments FOR SELECT
  USING (verify_patient_ownership(patient_id));

CREATE POLICY "Patients view own treatment assignments"
  ON patient_treatment_assignments FOR SELECT
  USING (verify_patient_ownership(patient_id));

CREATE POLICY "Patients view own hospital assignments"
  ON patient_hospital_assignments FOR SELECT
  USING (verify_patient_ownership(patient_id));

CREATE POLICY "Patients view own escort assignments"
  ON patient_escort_assignments FOR SELECT
  USING (verify_patient_ownership(patient_id));

-- ==============================================================================
-- TRIGGERS TO AUTOMATE updated_at TIMESTAMP
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_assigned_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_pda_updated_at
  BEFORE UPDATE ON patient_doctor_assignments
  FOR EACH ROW EXECUTE FUNCTION update_assigned_tables_updated_at();

CREATE TRIGGER trg_update_pcta_updated_at
  BEFORE UPDATE ON patient_care_team_assignments
  FOR EACH ROW EXECUTE FUNCTION update_assigned_tables_updated_at();

CREATE TRIGGER trg_update_pta_updated_at
  BEFORE UPDATE ON patient_treatment_assignments
  FOR EACH ROW EXECUTE FUNCTION update_assigned_tables_updated_at();

CREATE TRIGGER trg_update_pha_updated_at
  BEFORE UPDATE ON patient_hospital_assignments
  FOR EACH ROW EXECUTE FUNCTION update_assigned_tables_updated_at();

-- ==============================================================================
-- COMPREHENSIVE VIEW: Relational Summary of Patient Assignments
-- Combines patients, assigned doctors, hospital rooms, and treatments into a unified query
-- ==============================================================================
CREATE OR REPLACE VIEW view_patient_assigned_overview AS
SELECT 
  p.id AS patient_id,
  p.full_name AS patient_name,
  p.email AS patient_email,
  p.country AS patient_country,
  p.status AS patient_status,
  
  -- Coordinator assignment info
  ca.coordinator_id,
  oc.full_name AS coordinator_name,
  oc.phone AS coordinator_phone,
  
  -- Primary assigned doctor
  pda.id AS doctor_assignment_id,
  pda.doctor_id,
  d.full_name AS assigned_doctor_name,
  d.specialty AS assigned_doctor_specialty,
  pda.role AS doctor_role,
  pda.status AS doctor_assignment_status,
  
  -- Assigned treatment plan
  pta.id AS treatment_assignment_id,
  pta.treatment_id,
  t.name AS assigned_treatment_name,
  pta.stage AS treatment_stage,
  pta.scheduled_date AS treatment_scheduled_date,
  
  -- Assigned hospital room / bed
  pha.id AS hospital_assignment_id,
  h.name AS assigned_hospital_name,
  pha.ward_department AS assigned_ward,
  pha.room_number AS assigned_room,
  pha.bed_number AS assigned_bed,
  pha.status AS hospital_admission_status
FROM patients p
LEFT JOIN coordinator_assignments ca ON ca.patient_id = p.id AND ca.is_active = TRUE
LEFT JOIN official_coordinators oc ON ca.coordinator_id = oc.id
LEFT JOIN patient_doctor_assignments pda ON pda.patient_id = p.id AND pda.status = 'active' AND (pda.is_lead_doctor = TRUE OR pda.role = 'primary_physician')
LEFT JOIN doctors d ON pda.doctor_id = d.id
LEFT JOIN patient_treatment_assignments pta ON pta.patient_id = p.id AND pta.stage NOT IN ('completed', 'deferred')
LEFT JOIN treatments t ON pta.treatment_id = t.id
LEFT JOIN patient_hospital_assignments pha ON pha.patient_id = p.id AND pha.status IN ('reserved', 'admitted', 'in_surgery', 'recovering')
LEFT JOIN hospitals h ON pha.hospital_id = h.id;
