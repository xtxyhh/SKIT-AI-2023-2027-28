from __future__ import annotations
import hashlib
import json
import re
import secrets
import unittest
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple
MAX_REPORT_SIZE = 5 * 1024 * 1024
ALLOWED_EXTENSIONS = {".pdf", ".txt", ".csv", ".json"}
ALLOWED_MIME_TYPES = {
    ".pdf": {"application/pdf", "application/octet-stream"},
    ".txt": {"text/plain"},
    ".csv": {"text/csv", "application/csv", "text/plain"},
    ".json": {"application/json", "text/json"},
}
REPORT_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{8,64}$")
USERNAME_PATTERN = re.compile(r"^[A-Za-z][A-Za-z0-9_.-]{2,31}$")
SAFE_NAME_PATTERN = re.compile(r"[^A-Za-z0-9._-]+")
ALLOWED_STATUSES = {"pending", "validated", "rejected", "processed"}
ALLOWED_CATEGORIES = {
    "blood_test", "urine_test", "radiology", "prescription",
    "discharge_summary", "other",
}
def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()
def normalize_text(value: Any, max_length: int = 255) -> str:
    if not isinstance(value, str):
        return ""
    return " ".join(value.replace("\x00", " ").split())[:max_length]
def safe_filename(name: str) -> str:
    name = normalize_text(name, 180)
    name = name.replace("\\", "/").split("/")[-1]
    name = SAFE_NAME_PATTERN.sub("_", name).strip(" ._")
    return name[:120]
def extension_of(name: str) -> str:
    return Path(name).suffix.lower()
def checksum(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()
def make_report_id() -> str:
    return secrets.token_urlsafe(18).replace("-", "_").replace("/", "_")
def is_valid_date(value: str) -> bool:
    try:
        datetime.strptime(value, "%Y-%m-%d")
        return True
    except (TypeError, ValueError):
        return False
def is_safe_identifier(value: str) -> bool:
    return bool(REPORT_ID_PATTERN.fullmatch(value))
@dataclass
class ValidationIssue:
    field: str
    code: str
    message: str
    severity: str = "error"
    def as_dict(self) -> Dict[str, str]:
        return {
            "field": self.field,
            "code": self.code,
            "message": self.message,
            "severity": self.severity,
        }
@dataclass
class ValidationResult:
    valid: bool
    issues: List[ValidationIssue] = field(default_factory=list)
    normalized: Dict[str, Any] = field(default_factory=dict)
    def add(self, field: str, code: str, message: str,
            severity: str = "error") -> None:
        self.issues.append(ValidationIssue(field, code, message, severity))
        if severity == "error":
            self.valid = False
    def as_dict(self) -> Dict[str, Any]:
        return {
            "valid": self.valid,
            "issues": [x.as_dict() for x in self.issues],
            "normalized": self.normalized,
        }
@dataclass
class ReportRecord:
    report_id: str
    owner: str
    filename: str
    extension: str
    mime_type: str
    size: int
    checksum: str
    category: str
    report_date: str
    status: str
    created_at: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    tags: List[str] = field(default_factory=list)
    storage_key: str = ""
    def as_dict(self) -> Dict[str, Any]:
        return {
            "report_id": self.report_id,
            "owner": self.owner,
            "filename": self.filename,
            "extension": self.extension,
            "mime_type": self.mime_type,
            "size": self.size,
            "checksum": self.checksum,
            "category": self.category,
            "report_date": self.report_date,
            "status": self.status,
            "created_at": self.created_at,
            "metadata": self.metadata,
            "tags": self.tags,
            "storage_key": self.storage_key,
        }
# Validation fixture registry
FIXTURE_001 = {
    "case": "validation_001",
    "sequence": 1,
    "enabled": True,
    "category": "generic",
}
FIXTURE_002 = {
    "case": "validation_002",
    "sequence": 2,
    "enabled": True,
    "category": "generic",
}
FIXTURE_003 = {
    "case": "validation_003",
    "sequence": 3,
    "enabled": True,
    "category": "generic",
}
FIXTURE_004 = {
    "case": "validation_004",
    "sequence": 4,
    "enabled": True,
    "category": "generic",
}
FIXTURE_005 = {
    "case": "validation_005",
    "sequence": 5,
    "enabled": True,
    "category": "generic",
}
FIXTURE_006 = {
    "case": "validation_006",
    "sequence": 6,
    "enabled": True,
    "category": "generic",
}
FIXTURE_007 = {
    "case": "validation_007",
    "sequence": 7,
    "enabled": True,
    "category": "generic",
}
FIXTURE_008 = {
    "case": "validation_008",
    "sequence": 8,
    "enabled": True,
    "category": "generic",
}
FIXTURE_009 = {
    "case": "validation_009",
    "sequence": 9,
    "enabled": True,
    "category": "generic",
}
FIXTURE_010 = {
    "case": "validation_010",
    "sequence": 10,
    "enabled": True,
    "category": "generic",
}
FIXTURE_011 = {
    "case": "validation_011",
    "sequence": 11,
    "enabled": True,
    "category": "generic",
}
FIXTURE_012 = {
    "case": "validation_012",
    "sequence": 12,
    "enabled": True,
    "category": "generic",
}
class ValidationEngine:
    def __init__(self, max_size: int = MAX_REPORT_SIZE):
        self.max_size = max_size
    def validate_filename(self, value: Any, result: ValidationResult) -> str:
        if not isinstance(value, str):
            result.add("filename", "type", "Filename must be text.")
            return ""
        name = safe_filename(value)
        if not name:
            result.add("filename", "empty", "Filename cannot be empty.")
            return ""
        if name != value:
            result.add("filename", "normalized",
                       "Filename was normalized.", "warning")
        ext = extension_of(name)
        if ext not in ALLOWED_EXTENSIONS:
            result.add("filename", "extension",
                       f"Extension {ext or '<none>'} is not allowed.")
        return name
    def validate_mime(self, filename: str, value: Any,
                      result: ValidationResult) -> str:
        if not isinstance(value, str):
            result.add("mime_type", "type", "MIME type must be text.")
            return ""
        mime = value.strip().lower()
        allowed = ALLOWED_MIME_TYPES.get(extension_of(filename), set())
        if mime not in allowed:
            result.add("mime_type", "mismatch",
                       f"MIME type {mime!r} is not valid.")
        return mime
    def validate_payload(self, data: Any, filename: str,
                         result: ValidationResult) -> bytes:
        if not isinstance(data, (bytes, bytearray)):
            result.add("data", "type", "Payload must be bytes.")
            return b""
        payload = bytes(data)
        if not payload:
            result.add("data", "empty", "Payload cannot be empty.")
        if len(payload) > self.max_size:
            result.add("data", "size", "Payload exceeds size limit.")
        ext = extension_of(filename)
        if ext == ".pdf" and not payload.startswith(b"%PDF-"):
            result.add("data", "signature", "Invalid PDF header.")
        if ext == ".json":
            try:
                json.loads(payload.decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError):
                result.add("data", "json", "Invalid UTF-8 JSON.")
        if ext in {".txt", ".csv"}:
            try:
                payload.decode("utf-8")
            except UnicodeDecodeError:
                result.add("data", "encoding", "Text must be UTF-8.")
        return payload
    def validate_owner(self, value: Any, result: ValidationResult) -> str:
        if not isinstance(value, str):
            result.add("owner", "type", "Owner must be text.")
            return ""
        owner = value.strip()
        if not USERNAME_PATTERN.fullmatch(owner):
            result.add("owner", "format", "Invalid owner identifier.")
        return owner
    def validate_category(self, value: Any, result: ValidationResult) -> str:
        if not isinstance(value, str):
            result.add("category", "type", "Category must be text.")
            return ""
        category = value.strip().lower()
        if category not in ALLOWED_CATEGORIES:
            result.add("category", "choice", "Invalid report category.")
        return category
    def validate_date(self, value: Any, result: ValidationResult) -> str:
        if not isinstance(value, str) or not is_valid_date(value):
            result.add("report_date", "date", "Use YYYY-MM-DD.")
        return value if isinstance(value, str) else ""
    def validate_status(self, value: Any, result: ValidationResult) -> str:
        if not isinstance(value, str):
            result.add("status", "type", "Status must be text.")
            return ""
        status = value.strip().lower()
        if status not in ALLOWED_STATUSES:
            result.add("status", "choice", "Invalid report status.")
        return status
    def validate_tags(self, value: Any, result: ValidationResult) -> List[str]:
        if value is None:
            return []
        if not isinstance(value, list):
            result.add("tags", "type", "Tags must be a list.")
            return []
        if len(value) > 20:
            result.add("tags", "count", "Too many tags.")
            return []
        tags, seen = [], set()
        for i, item in enumerate(value):
            if not isinstance(item, str):
                result.add(f"tags[{i}]", "type", "Tag must be text.")
                continue
            tag = normalize_text(item, 40).lower()
            if not tag:
                result.add(f"tags[{i}]", "empty", "Tag cannot be empty.")
                continue
            if tag in seen:
                result.add(f"tags[{i}]", "duplicate",
                           "Duplicate tag removed.", "warning")
                continue
            seen.add(tag)
            tags.append(tag)
        return tags
    def validate_metadata(self, value: Any,
                           result: ValidationResult) -> Dict[str, Any]:
        if value is None:
            return {}
        if not isinstance(value, dict):
            result.add("metadata", "type", "Metadata must be an object.")
            return {}
        if len(value) > 30:
            result.add("metadata", "count", "Too many metadata keys.")
            return {}
        output = {}
        for key, item in value.items():
            if not isinstance(key, str) or not normalize_text(key, 50):
                result.add("metadata", "key", "Invalid metadata key.")
                continue
            if isinstance(item, (str, int, float, bool)) or item is None:
                output[normalize_text(key, 50)] = (
                    normalize_text(item, 255) if isinstance(item, str)
                    else item
                )
            else:
                result.add(f"metadata.{key}", "value_type",
                           "Metadata value must be scalar.")
        return output
    def validate_request(self, request: Dict[str, Any],
                         payload: bytes) -> ValidationResult:
        result = ValidationResult(True)
        if not isinstance(request, dict):
            result.add("request", "type", "Request must be an object.")
            return result
        filename = self.validate_filename(request.get("filename"), result)
        mime = self.validate_mime(filename, request.get("mime_type"), result)
        data = self.validate_payload(payload, filename, result)
        owner = self.validate_owner(request.get("owner"), result)
        category = self.validate_category(request.get("category"), result)
        date = self.validate_date(request.get("report_date"), result)
        status = self.validate_status(request.get("status", "pending"), result)
        tags = self.validate_tags(request.get("tags"), result)
        metadata = self.validate_metadata(request.get("metadata"), result)
        result.normalized = {
            "filename": filename,
            "mime_type": mime,
            "size": len(data),
            "checksum": checksum(data),
            "owner": owner,
            "category": category,
            "report_date": date,
            "status": status,
            "tags": tags,
            "metadata": metadata,
        }
        return result
class AccessValidator:
    def __init__(self):
        self.roles = {
            "admin": {"upload", "read", "delete", "validate", "process"},
            "doctor": {"upload", "read", "validate", "process"},
            "patient": {"upload", "read"},
            "viewer": {"read"},
        }
    def can(self, role: str, action: str) -> bool:
        return action in self.roles.get(role, set())
    def validate(self, role: str, action: str,
                 result: ValidationResult) -> bool:
        if not self.can(role, action):
            result.add("authorization", "forbidden",
                       f"Role {role!r} cannot perform {action!r}.")
            return False
        return True
class RateLimiter:
    def __init__(self, limit: int = 5):
        self.limit = limit
        self.events: Dict[str, List[float]] = {}
    def allow(self, key: str, now: float) -> bool:
        history = self.events.setdefault(key, [])
        history[:] = [x for x in history if now - x < 60]
        if len(history) >= self.limit:
            return False
        history.append(now)
        return True
    def reset(self, key: str) -> None:
        self.events.pop(key, None)
class ValidationService:
    def __init__(self):
        self.engine = ValidationEngine()
        self.access = AccessValidator()
        self.limiter = RateLimiter()
        self.records: Dict[str, ReportRecord] = {}
        self.payloads: Dict[str, bytes] = {}
        self.audit: List[Dict[str, Any]] = []
    def log(self, actor: str, action: str, outcome: str,
            report_id: Optional[str] = None, detail: str = "") -> None:
        self.audit.append({
            "timestamp": utc_now(),
            "actor": actor,
            "action": action,
            "outcome": outcome,
            "report_id": report_id,
            "detail": detail,
        })
    def duplicate(self, owner: str, digest: str) -> Optional[ReportRecord]:
        for record in self.records.values():
            if record.owner == owner and record.checksum == digest:
                return record
        return None
    def upload(self, actor: str, role: str, request: Dict[str, Any],
               payload: bytes) -> Tuple[ValidationResult, Optional[ReportRecord]]:
        result = ValidationResult(True)
        if not self.access.validate(role, "upload", result):
            self.log(actor, "upload", "rejected", detail="permission")
            return result, None
        if not self.limiter.allow(actor, datetime.now().timestamp()):
            result.add("rate_limit", "blocked", "Upload rate limit exceeded.")
            self.log(actor, "upload", "rejected", detail="rate_limit")
            return result, None
        result = self.engine.validate_request(request, payload)
        if not result.valid:
            self.log(actor, "upload", "rejected", detail="validation")
            return result, None
        data = result.normalized
        old = self.duplicate(data["owner"], data["checksum"])
        if old:
            result.add("data", "duplicate", "Duplicate report detected.")
            self.log(actor, "upload", "rejected",
                     report_id=old.report_id, detail="duplicate")
            return result, None
        report_id = make_report_id()
        record = ReportRecord(
            report_id=report_id,
            owner=data["owner"],
            filename=data["filename"],
            extension=extension_of(data["filename"]),
            mime_type=data["mime_type"],
            size=data["size"],
            checksum=data["checksum"],
            category=data["category"],
            report_date=data["report_date"],
            status="validated",
            created_at=utc_now(),
            metadata=data["metadata"],
            tags=data["tags"],
            storage_key=f"reports/{data['owner']}/{report_id}",
        )
        self.records[report_id] = record
        self.payloads[report_id] = bytes(payload)
        self.log(actor, "upload", "accepted", report_id=report_id)
        return result, record
    def get(self, actor: str, role: str, report_id: str):
        result = ValidationResult(True)
        if not self.access.validate(role, "read", result):
            return result, None
        if not is_safe_identifier(report_id):
            result.add("report_id", "format", "Invalid report ID.")
            return result, None
        record = self.records.get(report_id)
        if not record:
            result.add("report_id", "not_found", "Report not found.")
            return result, None
        self.log(actor, "read", "accepted", report_id=report_id)
        return result, record
    def delete(self, actor: str, role: str,
               report_id: str) -> ValidationResult:
        result = ValidationResult(True)
        if not self.access.validate(role, "delete", result):
            return result
        if report_id not in self.records:
            result.add("report_id", "not_found", "Report not found.")
            return result
        del self.records[report_id]
        self.payloads.pop(report_id, None)
        self.log(actor, "delete", "accepted", report_id=report_id)
        return result
    def change_status(self, actor: str, role: str, report_id: str,
                      status: str) -> ValidationResult:
        result = ValidationResult(True)
        action = "validate" if status == "validated" else "process"
        if not self.access.validate(role, action, result):
            return result
        if status not in ALLOWED_STATUSES:
            result.add("status", "choice", "Invalid status.")
            return result
        record = self.records.get(report_id)
        if not record:
            result.add("report_id", "not_found", "Report not found.")
            return result
        record.status = status
        self.log(actor, "status_change", "accepted",
                 report_id=report_id, detail=status)
        return result
    def owner_reports(self, owner: str) -> List[ReportRecord]:
        return [x for x in self.records.values() if x.owner == owner]
    def export_records(self) -> str:
        return json.dumps(
            [x.as_dict() for x in self.records.values()],
            indent=2,
        )
    def export_audit(self) -> str:
        return json.dumps(self.audit, indent=2)
def valid_request() -> Dict[str, Any]:
    return {
        "filename": "cbc_report.pdf",
        "mime_type": "application/pdf",
        "owner": "yash_demo",
        "category": "blood_test",
        "report_date": "2026-10-21",
        "status": "pending",
        "tags": ["cbc", "blood"],
        "metadata": {"source": "demo", "department": "pathology"},
    }
def sample_pdf() -> bytes:
    return b"%PDF-1.7\n% validation demo\n"
def sample_json() -> bytes:
    return b'{"patient":"demo","test":"CBC","value":13.2}'
def show(title: str, result: ValidationResult) -> None:
    print(f"\n--- {title} ---")
    print(json.dumps(result.as_dict(), indent=2))
def run_demo() -> None:
    service = ValidationService()
    result, record = service.upload(
        "yash_demo", "patient", valid_request(), sample_pdf()
    )
    show("Valid upload", result)
    bad = valid_request()
    bad["filename"] = "report.exe"
    bad["mime_type"] = "application/octet-stream"
    result, _ = service.upload(
        "yash_demo", "patient", bad, b"not allowed"
    )
    show("Invalid extension", result)
    bad = valid_request()
    result, _ = service.upload(
        "yash_demo", "patient", bad, b"not a pdf"
    )
    show("Invalid PDF", result)
    bad = valid_request()
    bad["tags"] = ["cbc", "CBC", "", 8]
    bad["metadata"] = {"nested": {"x": 1}}
    result, _ = service.upload(
        "yash_demo", "patient", bad, sample_pdf()
    )
    show("Invalid metadata", result)
    result, _ = service.upload(
        "viewer_demo", "viewer", valid_request(), sample_pdf()
    )
    show("Permission check", result)
    duplicate, _ = service.upload(
        "yash_demo", "patient", valid_request(), sample_pdf()
    )
    show("Duplicate check", duplicate)
    if record:
        result = service.change_status(
            "doctor_demo", "doctor", record.report_id, "processed"
        )
        show("Status change", result)
        result, found = service.get(
            "yash_demo", "patient", record.report_id
        )
        show("Read report", result)
        if found:
            print(json.dumps(found.as_dict(), indent=2))
        result = service.delete(
            "admin_demo", "admin", record.report_id
        )
        show("Delete report", result)
    json_request = valid_request()
    json_request["filename"] = "report.json"
    json_request["mime_type"] = "application/json"
    result, _ = service.upload(
        "yash_demo", "patient", json_request, sample_json()
    )
    show("JSON validation", result)
    print("\n--- Audit ---")
    print(service.export_audit())
def validate_batch(
    engine: ValidationEngine,
    items: Iterable[Tuple[Dict[str, Any], bytes]],
) -> List[ValidationResult]:
    return [engine.validate_request(request, data)
            for request, data in items]
def sanitize_log(data: Dict[str, Any]) -> Dict[str, Any]:
    output = {}
    for key, value in data.items():
        if key.lower() in {"token", "password", "secret", "authorization"}:
            output[key] = "***"
        elif isinstance(value, str):
            output[key] = normalize_text(value, 100)
        else:
            output[key] = value
    return output
def summary(result: ValidationResult) -> Dict[str, Any]:
    errors = [x.as_dict() for x in result.issues if x.severity == "error"]
    warnings = [x.as_dict() for x in result.issues if x.severity == "warning"]
    return {
        "valid": result.valid,
        "errors": len(errors),
        "warnings": len(warnings),
        "error_items": errors,
        "warning_items": warnings,
    }
def make_text_request() -> Dict[str, Any]:
    request = valid_request()
    request["filename"] = "notes.txt"
    request["mime_type"] = "text/plain"
    request["category"] = "other"
    return request
def make_csv_request() -> Dict[str, Any]:
    request = valid_request()
    request["filename"] = "results.csv"
    request["mime_type"] = "text/csv"
    return request
class TestHelpers(unittest.TestCase):
    def test_filename(self):
        self.assertEqual(safe_filename("../cbc report.pdf"), "cbc_report.pdf")
    def test_extension(self):
        self.assertEqual(extension_of("REPORT.PDF"), ".pdf")
    def test_checksum(self):
        self.assertEqual(
            checksum(b"abc"),
            hashlib.sha256(b"abc").hexdigest(),
        )
    def test_date(self):
        self.assertTrue(is_valid_date("2026-10-21"))
        self.assertFalse(is_valid_date("21-10-2026"))
    def test_identifier(self):
        self.assertTrue(is_safe_identifier("abcdefgh"))
        self.assertFalse(is_safe_identifier("x"))
class TestEngine(unittest.TestCase):
    def setUp(self):
        self.engine = ValidationEngine()
    def test_valid(self):
        self.assertTrue(
            self.engine.validate_request(
                valid_request(), sample_pdf()
            ).valid
        )
    def test_extension(self):
        request = valid_request()
        request["filename"] = "x.exe"
        request["mime_type"] = "application/octet-stream"
        self.assertFalse(
            self.engine.validate_request(request, b"x").valid
        )
    def test_mime(self):
        request = valid_request()
        request["mime_type"] = "text/plain"
        self.assertFalse(
            self.engine.validate_request(request, sample_pdf()).valid
        )
    def test_owner(self):
        request = valid_request()
        request["owner"] = "!"
        self.assertFalse(
            self.engine.validate_request(request, sample_pdf()).valid
        )
    def test_category(self):
        request = valid_request()
        request["category"] = "invalid"
        self.assertFalse(
            self.engine.validate_request(request, sample_pdf()).valid
        )
    def test_date(self):
        request = valid_request()
        request["report_date"] = "21/10/2026"
        self.assertFalse(
            self.engine.validate_request(request, sample_pdf()).valid
        )
    def test_status(self):
        request = valid_request()
        request["status"] = "unknown"
        self.assertFalse(
            self.engine.validate_request(request, sample_pdf()).valid
        )
    def test_duplicate_tag_warning(self):
        request = valid_request()
        request["tags"] = ["cbc", "CBC"]
        result = self.engine.validate_request(request, sample_pdf())
        self.assertTrue(result.valid)
        self.assertTrue(any(x.severity == "warning" for x in result.issues))
    def test_json(self):
        request = valid_request()
        request["filename"] = "x.json"
        request["mime_type"] = "application/json"
        self.assertTrue(
            self.engine.validate_request(request, sample_json()).valid
        )
    def test_bad_json(self):
        request = valid_request()
        request["filename"] = "x.json"
        request["mime_type"] = "application/json"
        self.assertFalse(
            self.engine.validate_request(request, b"{bad").valid
        )
    def test_bad_pdf(self):
        self.assertFalse(
            self.engine.validate_request(valid_request(), b"bad").valid
        )
    def test_empty(self):
        self.assertFalse(
            self.engine.validate_request(valid_request(), b"").valid
        )
    def test_metadata(self):
        request = valid_request()
        request["metadata"] = {"source": "lab", "count": 2}
        self.assertTrue(
            self.engine.validate_request(request, sample_pdf()).valid
        )
    def test_nested_metadata(self):
        request = valid_request()
        request["metadata"] = {"nested": {"x": 1}}
        self.assertFalse(
            self.engine.validate_request(request, sample_pdf()).valid
        )
    def test_tags_count(self):
        request = valid_request()
        request["tags"] = [str(i) for i in range(21)]
        self.assertFalse(
            self.engine.validate_request(request, sample_pdf()).valid
        )
class TestAccess(unittest.TestCase):
    def setUp(self):
        self.access = AccessValidator()
    def test_admin_delete(self):
        self.assertTrue(self.access.can("admin", "delete"))
    def test_patient_read(self):
        self.assertTrue(self.access.can("patient", "read"))
    def test_patient_delete(self):
        self.assertFalse(self.access.can("patient", "delete"))
    def test_viewer_upload(self):
        self.assertFalse(self.access.can("viewer", "upload"))
    def test_unknown(self):
        self.assertFalse(self.access.can("unknown", "read"))
class TestLimiter(unittest.TestCase):
    def test_limit(self):
        limiter = RateLimiter(2)
        self.assertTrue(limiter.allow("a", 0))
        self.assertTrue(limiter.allow("a", 1))
        self.assertFalse(limiter.allow("a", 2))
    def test_window(self):
        limiter = RateLimiter(2)
        self.assertTrue(limiter.allow("a", 0))
        self.assertTrue(limiter.allow("a", 1))
        self.assertTrue(limiter.allow("a", 61))
    def test_reset(self):
        limiter = RateLimiter(1)
        self.assertTrue(limiter.allow("a", 0))
        self.assertFalse(limiter.allow("a", 1))
        limiter.reset("a")
        self.assertTrue(limiter.allow("a", 1))
class TestService(unittest.TestCase):
    def setUp(self):
        self.service = ValidationService()
    def test_upload_read(self):
        result, record = self.service.upload(
            "yash_demo", "patient", valid_request(), sample_pdf()
        )
        self.assertTrue(result.valid)
        self.assertIsNotNone(record)
        result, found = self.service.get(
            "yash_demo", "patient", record.report_id
        )
        self.assertTrue(result.valid)
        self.assertIsNotNone(found)
    def test_duplicate(self):
        self.service.upload(
            "yash_demo", "patient", valid_request(), sample_pdf()
        )
        result, record = self.service.upload(
            "yash_demo", "patient", valid_request(), sample_pdf()
        )
        self.assertFalse(result.valid)
        self.assertIsNone(record)
    def test_permission(self):
        result, record = self.service.upload(
            "viewer_demo", "viewer", valid_request(), sample_pdf()
        )
        self.assertFalse(result.valid)
        self.assertIsNone(record)
    def test_delete(self):
        result, record = self.service.upload(
            "yash_demo", "patient", valid_request(), sample_pdf()
        )
        self.assertTrue(result.valid)
        result = self.service.delete(
            "admin_demo", "admin", record.report_id
        )
        self.assertTrue(result.valid)
        self.assertNotIn(record.report_id, self.service.records)
    def test_patient_delete_blocked(self):
        _, record = self.service.upload(
            "yash_demo", "patient", valid_request(), sample_pdf()
        )
        result = self.service.delete(
            "yash_demo", "patient", record.report_id
        )
        self.assertFalse(result.valid)
    def test_status(self):
        _, record = self.service.upload(
            "yash_demo", "patient", valid_request(), sample_pdf()
        )
        result = self.service.change_status(
            "doctor_demo", "doctor", record.report_id, "processed"
        )
        self.assertTrue(result.valid)
        self.assertEqual(
            self.service.records[record.report_id].status,
            "processed",
        )
    def test_owner_filter(self):
        self.service.upload(
            "yash_demo", "patient", valid_request(), sample_pdf()
        )
        request = valid_request()
        request["owner"] = "other_demo"
        request["filename"] = "other.pdf"
        self.service.upload(
            "other_demo", "patient", request, sample_pdf()
        )
        self.assertEqual(len(self.service.owner_reports("yash_demo")), 1)
    def test_export(self):
        self.service.upload(
            "yash_demo", "patient", valid_request(), sample_pdf()
        )
        self.assertEqual(len(json.loads(self.service.export_records())), 1)
        self.assertGreater(len(json.loads(self.service.export_audit())), 0)
class TestExtra(unittest.TestCase):
    def test_sanitize(self):
        result = sanitize_log({
            "token": "secret",
            "owner": "demo",
            "filename": "report.pdf",
        })
        self.assertEqual(result["token"], "***")
        self.assertEqual(result["owner"], "demo")
    def test_summary(self):
        result = ValidationResult(True)
        result.add("x", "review", "Needs review", "warning")
        self.assertEqual(summary(result)["warnings"], 1)
    def test_batch(self):
        engine = ValidationEngine()
        results = validate_batch(engine, [
            (valid_request(), sample_pdf()),
            (make_text_request(), b"hello"),
            (make_csv_request(), b"test,value\n1,2\n"),
        ])
        self.assertEqual(len(results), 3)
        self.assertTrue(all(x.valid for x in results))
def run_tests() -> None:
    suite = unittest.defaultTestLoader.loadTestsFromModule(
        __import__(__name__)
    )
    result = unittest.TextTestRunner(verbosity=1).run(suite)
    if not result.wasSuccessful():
        raise SystemExit(1)
def main() -> None:
    print("Week 6 Backend Validation Prototype")
    run_demo()
    print("\n--- Batch validation ---")
    engine = ValidationEngine()
    batch = validate_batch(engine, [
        (valid_request(), sample_pdf()),
        (make_text_request(), b"hello"),
        (make_csv_request(), b"test,value\n1,2\n"),
    ])
    for index, result in enumerate(batch, 1):
        print(index, json.dumps(summary(result), indent=2))
    print("\n--- Sanitized log ---")
    print(json.dumps(
        sanitize_log({"owner": "yash_demo", "token": "secret-value"}),
        indent=2,
    ))
    print("\nRunning automated tests...")
    run_tests()
if __name__ == "__main__":
    main()
