"""Week 04: Local Row Level Security policy simulator."""
from dataclasses import dataclass
from enum import Enum

class Role(Enum):
    PATIENT = "patient"
    COORDINATOR = "coordinator"
    ADMIN = "admin"

@dataclass(frozen=True)
class Actor:
    user_id: str
    role: Role

@dataclass
class Record:
    record_id: str
    patient_id: str
    coordinator_id: str
    status: str = "active"

class RLSSimulator:
    """Simple local policy model for reasoning about access rules."""

    @staticmethod
    def can_read(actor: Actor, record: Record) -> bool:
        if actor.role is Role.ADMIN:
            return True
        if actor.role is Role.PATIENT:
            return actor.user_id == record.patient_id
        if actor.role is Role.COORDINATOR:
            return actor.user_id == record.coordinator_id
        return False

    @staticmethod
    def can_update(actor: Actor, record: Record) -> bool:
        if actor.role is Role.ADMIN:
            return True
        if actor.role is Role.COORDINATOR:
            return actor.user_id == record.coordinator_id
        return False

    @staticmethod
    def can_delete(actor: Actor, record: Record) -> bool:
        return actor.role is Role.ADMIN

def check(actor, record):
    return {
        "read": RLSSimulator.can_read(actor, record),
        "update": RLSSimulator.can_update(actor, record),
        "delete": RLSSimulator.can_delete(actor, record),
    }

def main():
    record = Record("R001", "P001", "C001")
    actors = [
        Actor("P001", Role.PATIENT),
        Actor("P999", Role.PATIENT),
        Actor("C001", Role.COORDINATOR),
        Actor("C999", Role.COORDINATOR),
        Actor("A001", Role.ADMIN),
    ]

    print("Local RLS policy simulation")
    print("-" * 50)
    for actor in actors:
        print(actor.role.value, actor.user_id, "=>", check(actor, record))

if __name__ == "__main__":
    main()
