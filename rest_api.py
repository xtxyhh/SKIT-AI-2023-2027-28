"""Week 03: In-memory REST API design prototype."""
from dataclasses import dataclass, asdict
from typing import Dict, Optional

@dataclass
class Patient:
    patient_id: str
    name: str
    city: str

class MockPatientAPI:
    def __init__(self):
        self.records: Dict[str, Patient] = {}

    def create(self, patient: Patient):
        if patient.patient_id in self.records:
            return {"status": 409, "error": "patient already exists"}
        self.records[patient.patient_id] = patient
        return {"status": 201, "data": asdict(patient)}

    def get(self, patient_id: str):
        patient = self.records.get(patient_id)
        if patient is None:
            return {"status": 404, "error": "patient not found"}
        return {"status": 200, "data": asdict(patient)}

    def update(self, patient_id: str, name: Optional[str] = None,
               city: Optional[str] = None):
        patient = self.records.get(patient_id)
        if patient is None:
            return {"status": 404, "error": "patient not found"}
        if name is not None: patient.name = name
        if city is not None: patient.city = city
        return {"status": 200, "data": asdict(patient)}

    def delete(self, patient_id: str):
        if patient_id not in self.records:
            return {"status": 404, "error": "patient not found"}
        del self.records[patient_id]
        return {"status": 204}

def main():
    api = MockPatientAPI()
    print("CREATE:", api.create(Patient("P001", "Demo Patient", "Jaipur")))
    print("GET:", api.get("P001"))
    print("UPDATE:", api.update("P001", city="Delhi"))
    print("GET:", api.get("P001"))
    print("DELETE:", api.delete("P001"))
    print("GET:", api.get("P001"))

if __name__ == "__main__":
    main()
