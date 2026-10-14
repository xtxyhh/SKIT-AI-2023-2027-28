"""Week 05: Standalone medical report upload prototype for HealWithIndia.
Local-only: no main-app, database, Supabase, network, or cloud integration.
"""
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import PurePath
from typing import Dict, List, Optional
import json
import mimetypes
import re
import uuid

MAX_FILE_BYTES = 5 * 1024 * 1024
ALLOWED_EXTENSIONS = {'.pdf', '.txt', '.csv', '.json'}
ALLOWED_MIME_TYPES = {'application/pdf', 'text/plain', 'text/csv', 'application/json'}

@dataclass
class UploadRequest:
    patient_id: str
    filename: str
    content: bytes
    declared_mime: Optional[str] = None

@dataclass
class ReportRecord:
    report_id: str
    patient_id: str
    original_filename: str
    safe_filename: str
    extension: str
    mime_type: str
    byte_size: int
    checksum_sha256: str
    uploaded_at: str
    status: str = 'accepted'
    tags: List[str] = field(default_factory=list)

@dataclass
class UploadResult:
    accepted: bool
    message: str
    report: Optional[ReportRecord] = None

class UploadError(ValueError):
    pass

class FilenamePolicy:
    _unsafe = re.compile(r'[^A-Za-z0-9._-]+')

    @classmethod
    def safe_name(cls, filename: str) -> str:
        name = PurePath(filename.replace('\\', '/')).name
        name = cls._unsafe.sub('_', name).strip('._')
        if not name:
            raise UploadError('filename is empty after normalization')
        return name[:150]

    @staticmethod
    def extension(filename: str) -> str:
        return PurePath(filename).suffix.lower()

    @classmethod
    def validate_extension(cls, filename: str) -> str:
        extension = cls.extension(filename)
        if extension not in ALLOWED_EXTENSIONS:
            raise UploadError('unsupported file extension')
        return extension

class ReportInspector:
    @staticmethod
    def checksum(content: bytes) -> str:
        return sha256(content).hexdigest()

    @staticmethod
    def detect_mime(filename: str, content: bytes) -> str:
        extension = PurePath(filename).suffix.lower()
        if extension == '.pdf':
            if not content.startswith(b'%PDF-'):
                raise UploadError('PDF signature is missing')
            return 'application/pdf'
        guessed, _ = mimetypes.guess_type(filename)
        if guessed in ALLOWED_MIME_TYPES:
            return guessed
        return {'.txt': 'text/plain', '.csv': 'text/csv', '.json': 'application/json'}.get(extension, 'application/octet-stream')

    @staticmethod
    def validate_text_bytes(extension: str, content: bytes) -> None:
        if extension == '.pdf':
            return
        try:
            decoded = content.decode('utf-8')
        except UnicodeDecodeError as exc:
            raise UploadError('text-based report must be UTF-8') from exc
        if extension == '.json':
            try:
                json.loads(decoded)
            except json.JSONDecodeError as exc:
                raise UploadError('JSON report is not valid JSON') from exc

    @staticmethod
    def infer_tags(content: bytes) -> List[str]:
        text = content.decode('utf-8', errors='ignore').lower()
        terms = {'blood': 'blood', 'mri': 'mri', 'ct scan': 'ct-scan', 'prescription': 'prescription', 'discharge': 'discharge', 'diagnosis': 'diagnosis', 'consultation': 'consultation'}
        return sorted(tag for term, tag in terms.items() if term in text)

class InMemoryReportStorage:
    """Ephemeral content store; it does not write to disk or external services."""
    def __init__(self) -> None:
        self._objects: Dict[str, bytes] = {}

    def save(self, key: str, content: bytes) -> None:
        self._objects[key] = bytes(content)

    def read(self, key: str) -> Optional[bytes]:
        return self._objects.get(key)

    def delete(self, key: str) -> bool:
        if key not in self._objects:
            return False
        del self._objects[key]
        return True

    def has(self, key: str) -> bool:
        return key in self._objects

    def object_count(self) -> int:
        return len(self._objects)

class InMemoryReportCatalog:
    """Ephemeral metadata index used instead of a database in this demo."""
    def __init__(self) -> None:
        self._records: Dict[str, ReportRecord] = {}

    def add(self, record: ReportRecord) -> None:
        self._records[record.report_id] = record

    def get(self, report_id: str) -> Optional[ReportRecord]:
        return self._records.get(report_id)

    def all(self) -> List[ReportRecord]:
        return list(self._records.values())

    def by_patient(self, patient_id: str) -> List[ReportRecord]:
        return [r for r in self._records.values() if r.patient_id == patient_id]

    def contains_checksum(self, patient_id: str, checksum: str) -> bool:
        return any(r.patient_id == patient_id and r.checksum_sha256 == checksum for r in self._records.values())

    def remove(self, report_id: str) -> Optional[ReportRecord]:
        return self._records.pop(report_id, None)

class ReportUploadService:
    def __init__(self, catalog: InMemoryReportCatalog, storage: InMemoryReportStorage) -> None:
        self.catalog = catalog
        self.storage = storage

    def upload(self, request: UploadRequest) -> UploadResult:
        try:
            record = self._process(request)
        except UploadError as exc:
            return UploadResult(False, str(exc))
        return UploadResult(True, 'report accepted', record)

    def _process(self, request: UploadRequest) -> ReportRecord:
        patient_id = request.patient_id.strip()
        if not patient_id:
            raise UploadError('patient_id is required')
        if not re.fullmatch(r'[A-Za-z0-9_-]{2,32}', patient_id):
            raise UploadError('patient_id format is invalid')
        if not request.filename.strip():
            raise UploadError('filename is required')
        if not isinstance(request.content, bytes):
            raise UploadError('content must be bytes')
        if not request.content:
            raise UploadError('empty file is not accepted')
        if len(request.content) > MAX_FILE_BYTES:
            raise UploadError('file exceeds the 5 MiB prototype limit')
        safe_filename = FilenamePolicy.safe_name(request.filename)
        extension = FilenamePolicy.validate_extension(safe_filename)
        mime_type = ReportInspector.detect_mime(safe_filename, request.content)
        ReportInspector.validate_text_bytes(extension, request.content)
        if request.declared_mime:
            if request.declared_mime not in ALLOWED_MIME_TYPES:
                raise UploadError('declared MIME type is not allowed')
            if request.declared_mime != mime_type:
                raise UploadError('declared MIME type does not match file')
        checksum = ReportInspector.checksum(request.content)
        if self.catalog.contains_checksum(patient_id, checksum):
            raise UploadError('duplicate report for this patient')
        report_id = 'RPT-' + uuid.uuid4().hex[:12].upper()
        key = f'{patient_id}/{report_id}{extension}'
        record = ReportRecord(report_id, patient_id, request.filename, safe_filename, extension, mime_type, len(request.content), checksum, datetime.now(timezone.utc).isoformat(), tags=ReportInspector.infer_tags(request.content))
        self.storage.save(key, request.content)
        self.catalog.add(record)
        return record

    def retrieve_content(self, report_id: str) -> Optional[bytes]:
        record = self.catalog.get(report_id)
        if record is None:
            return None
        return self.storage.read(f'{record.patient_id}/{record.report_id}{record.extension}')

    def remove_report(self, report_id: str) -> bool:
        record = self.catalog.get(report_id)
        if record is None:
            return False
        self.storage.delete(f'{record.patient_id}/{record.report_id}{record.extension}')
        self.catalog.remove(report_id)
        return True

def sample_requests() -> List[UploadRequest]:
    return [
        UploadRequest('P001', 'blood_report.txt', b'Routine blood diagnosis. Hemoglobin result: sample only.', 'text/plain'),
        UploadRequest('P001', 'consultation_notes.csv', b'date,category,note\n2026-10-01,consultation,demo follow-up\n', 'text/csv'),
        UploadRequest('P002', 'report.json', b'{"kind":"discharge","note":"synthetic example"}', 'application/json'),
    ]

def show_result(result: UploadResult) -> None:
    print(f'\nAccepted: {result.accepted}')
    print('Message:', result.message)
    if result.report:
        print(json.dumps(asdict(result.report), indent=2))

def run_invalid_examples(service: ReportUploadService) -> None:
    examples = [
        UploadRequest('', 'report.txt', b'sample'),
        UploadRequest('P010', 'program.exe', b'sample'),
        UploadRequest('P010', 'empty.txt', b''),
        UploadRequest('P010', 'wrong.pdf', b'not a real PDF'),
        UploadRequest('P010', 'bad.json', b'{invalid}', 'application/json'),
        UploadRequest('P010', 'bad.txt', b'\xff\xfe'),
        UploadRequest('P010', 'mismatch.txt', b'hello', 'application/pdf'),
    ]
    print('\nInvalid-input demonstrations')
    for request in examples:
        show_result(service.upload(request))

def run_duplicate_example(service: ReportUploadService, request: UploadRequest) -> None:
    print('\nDuplicate detection')
    show_result(service.upload(request))
    show_result(service.upload(request))

def show_patient_catalog(catalog: InMemoryReportCatalog, patient_id: str) -> None:
    print(f'\nReports for {patient_id}')
    records = catalog.by_patient(patient_id)
    if not records:
        print('No reports found')
        return
    for record in records:
        print(record.report_id, record.safe_filename, f'{record.byte_size} bytes', ','.join(record.tags) or 'no tags')

def main() -> None:
    print('HealWithIndia — Week 05 Report Upload Prototype')
    print('Standalone local demonstration; no external services used.')
    catalog = InMemoryReportCatalog()
    storage = InMemoryReportStorage()
    service = ReportUploadService(catalog, storage)
    requests = sample_requests()
    for request in requests:
        show_result(service.upload(request))
    run_duplicate_example(service, requests[0])
    run_invalid_examples(service)
    show_patient_catalog(catalog, 'P001')
    print('\nStored metadata records:', len(catalog.all()))
    print('Stored content objects:', storage.object_count())
    if catalog.all():
        content = service.retrieve_content(catalog.all()[0].report_id)
        print('First report can be retrieved:', content is not None)
    print('\nPrototype finished. Storage is memory-only.')

if __name__ == '__main__':
    main()
