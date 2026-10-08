"""Week 02: Local schema prototype for HealWithIndia.
No database connection is made; this only models proposed entities.
"""
from dataclasses import dataclass, asdict
from typing import List

@dataclass
class Patient:
    patient_id: str
    name: str
    email: str
    coordinator_id: str

@dataclass
class Hospital:
    hospital_id: str
    name: str
    city: str
    specialty: str

@dataclass
class Coordinator:
    coordinator_id: str
    name: str
    email: str

@dataclass
class Treatment:
    treatment_id: str
    hospital_id: str
    name: str
    estimated_cost: float

def validate_records(patients: List[Patient], hospitals: List[Hospital],
                     coordinators: List[Coordinator],
                     treatments: List[Treatment]):
    errors = []
    patient_ids = {p.patient_id for p in patients}
    hospital_ids = {h.hospital_id for h in hospitals}
    coordinator_ids = {c.coordinator_id for c in coordinators}

    for p in patients:
        if p.coordinator_id not in coordinator_ids:
            errors.append(f"{p.patient_id}: missing coordinator")

    for t in treatments:
        if t.hospital_id not in hospital_ids:
            errors.append(f"{t.treatment_id}: missing hospital")
        if t.estimated_cost < 0:
            errors.append(f"{t.treatment_id}: negative cost")

    return errors

def main():
    patients = [Patient("P001", "Demo Patient", "patient@example.com", "C001")]
    hospitals = [Hospital("H001", "Demo Hospital", "Jaipur", "General Medicine")]
    coordinators = [Coordinator("C001", "Demo Coordinator", "coord@example.com")]
    treatments = [Treatment("T001", "H001", "Consultation", 1500.0)]

    errors = validate_records(patients, hospitals, coordinators, treatments)
    print("Local schema prototype")
    print("Entities:", [type(x).__name__ for x in
                         [patients[0], hospitals[0], coordinators[0], treatments[0]]])
    print("Validation:", "PASS" if not errors else errors)

if __name__ == "__main__":
    main()
