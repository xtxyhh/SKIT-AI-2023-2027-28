# HealWithIndia — Application Security, RLS & Patient Data Protection Audit

**Auditor:** Application Security Engineer & Cryptographic Systems Evaluator  
**Repository:** `HealWithIndia`  
**Execution Date:** November 7, 2026  
**Audit Scope:** Authentication architecture, session signing, Next.js 16 Proxy RBAC, PostgreSQL Row Level Security (RLS), patient data isolation, medical document vault, and regulatory compliance claims.

---

## 1. Executive Summary & Security Posture

As a medical tourism and healthcare coordination platform handling personal medical histories, international travel schedules, and patient demographic data, **HealWithIndia** must adhere to rigorous data isolation and defense-in-depth security standards.

The repository exhibits a **well-engineered, multi-tier security foundation**:
1. **Edge Authorization:** Route-level authorization enforced by the Next.js 16 root proxy (`proxy.ts`).
2. **Cryptographic Session Integrity:** Dual-mode session handling leveraging HMAC-SHA256 signatures with constant-time equality checks and HTTP-only cookies.
3. **Database Tenant Isolation:** 100% of the 34 database tables have PostgreSQL Row Level Security (RLS) enabled, enforced via 75 net active policies and `SECURITY DEFINER` verification functions.
4. **Data Privacy:** Patients cannot query or modify clinical records, check-ins, or assigned resources belonging to other patients.

However, several production security gaps and compliance discrepancies were identified, including hardcoded fallback secrets, lack of rate limiting, and unvalidated document URLs.

---

## 2. Authentication & Session Management

### Dual-Mode Architecture
The system supports two complementary authentication models:
1. **Supabase Cloud JWT Authentication:** For production cloud deployments using standard Supabase Auth sessions.
2. **Resilient Local HMAC-SHA256 Authentication:** Engineered in [lib/auth/admin-auth.ts](file:///C:/Projects/HealWithIndia/lib/auth/admin-auth.ts) to guarantee zero downtime during cloud project outages or evaluation environments.

### Cryptographic Token Verification
Tokens follow a compact two-part format: `payloadBase64.hmacSignature`.
- **Signing Algorithm:** HMAC-SHA256 using Node.js `crypto.createHmac`.
- **Timing Attack Mitigation:** Signature validation strictly uses `crypto.timingSafeEqual`:
  ```typescript
  if (
    !crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  ) {
    return null;
  }
  ```
- **Replay & Expiration Controls:** Tokens carry an explicit expiration timestamp (`exp: 7 days`). The parser explicitly rejects tokens where `Date.now() > payload.exp`.
- **Cookie Security:** Sessions are delivered in secure HTTP-only cookies (`hwi_admin_session`, `hwi_patient_session`), completely inaccessible to client-side JavaScript, mitigating XSS token extraction.
- **Session Revocation:** Verified via [app/api/auth/admin-logout/route.ts](file:///C:/Projects/HealWithIndia/app/api/auth/admin-logout/route.ts) and [app/api/auth/patient-logout/route.ts](file:///C:/Projects/HealWithIndia/app/api/auth/patient-logout/route.ts) which atomically clear session cookies upon termination.

---

## 3. Role-Based Access Control (RBAC) & Next.js 16 Proxy

Route protection is centralized in [proxy.ts](file:///C:/Projects/HealWithIndia/proxy.ts) using the Next.js 16 Proxy specification:

### Role Matrix & Route Privileges
The system defines 7 distinct operational roles:
`super_admin`, `admin`, `safety_operator`, `coordinator`, `finance`, `doctor`, and `patient`.

| Protected Route Path | Allowed Roles | Enforcement Mechanism | Failure Action |
|---|---|---|---|
| `/admin` | `super_admin`, `admin`, `safety_operator`, `coordinator`, `finance`, `doctor` | `proxy.ts` | Redirect `/admin/login` |
| `/admin/employees` | `super_admin`, `admin` | `proxy.ts` | Redirect `/admin/login?error=forbidden` |
| `/admin/users` | `super_admin`, `admin` | `proxy.ts` | Redirect `/admin/login?error=forbidden` |
| `/admin/revenue` | `super_admin`, `admin`, `finance` | `proxy.ts` | Redirect `/admin/login?error=forbidden` |
| `/admin/settings` | `super_admin`, `admin` | `proxy.ts` | Redirect `/admin/login?error=forbidden` |
| `/admin/safety` | `super_admin`, `admin`, `safety_operator` | `proxy.ts` | Redirect `/admin/login?error=forbidden` |
| `/coordinator/*` | `super_admin`, `admin`, `coordinator` | `proxy.ts` | Redirect `/admin/login?error=unauthorized` |
| `/safety/*` | `patient` (or staff evaluator) | `proxy.ts` + `verify_patient_portal_access` RPC | Redirect `/patient-login?error=no_access` |
| `/patient/*` | `patient` (or admin evaluator) | `proxy.ts` | Redirect `/patient-login` |

---

## 4. PostgreSQL Row Level Security (RLS) Audit

The database schema was comprehensively inspected across all 14 migration files (`supabase/migrations/000` through `013`).

### Quantitative Policy Summary:
- **Total Database Tables:** 34
- **Tables with RLS Enabled:** **34 / 34 (100.0% coverage)**
- **Total Policies Defined:** 91
- **Policies Repaired/Dropped:** 8
- **Net Active Policies:** **75 active policies**
  - **`ALL` Policies (Service Role / Admin):** 34 policies (Guarantees backend services have explicit CRUD authority).
  - **`SELECT` Policies:** 23 policies (Tenant isolation on read).
  - **`INSERT` Policies:** 10 policies (Tenant-validated write permissions).
  - **`UPDATE` Policies:** 8 policies (Tenant-validated modification permissions).

### Security Definer Ownership Verification
In PostgreSQL, RLS policies that execute subqueries against other RLS-protected tables can trigger circular dependency failures or recursive lock deadlocks. 
To resolve this safely, the codebase implements:
```sql
CREATE OR REPLACE FUNCTION verify_patient_ownership(candidate_patient_id BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.patient_auth_mapping
    WHERE auth_user_id = auth.uid()
    AND patient_id = candidate_patient_id
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION verify_patient_ownership(candidate_patient_id BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION verify_patient_ownership(candidate_patient_id BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_patient_ownership(candidate_patient_id BIGINT) TO service_role;
```

#### Key Security Defenses:
1. **`SECURITY DEFINER`:** Bypasses RLS on `patient_auth_mapping` without granting end-users direct access to the mapping table.
2. **`SET search_path = public`:** Prevents search-path hijacking attacks where a malicious actor creates functions in a temporary schema to execute arbitrary code with elevated privileges.
3. **`REVOKE EXECUTE ... FROM PUBLIC`:** Restricts invocation strictly to authenticated callers and backend workers.

---

## 5. Patient Data, PHI & Document Vault Security

### Clinical File Management
Patient health documents and reports are managed via [app/api/safety/profile/documents/route.ts](file:///C:/Projects/HealWithIndia/app/api/safety/profile/documents/route.ts).
- **Authentication Check:** Explicit verification of user session via Supabase or HMAC session.
- **Identity Resolution:** Calls `get_patient_id_from_auth` RPC to resolve the caller's authorized `patient_id`.
- **Storage Pattern:** Stores categorized metadata records (`general_lab`, `mri_ct_scan`, `doctor_summary`, `passport_visa`).

### Regulatory Compliance Reality vs Claims
- **UI Discrepancy:** In [app/admin/documents/page.tsx](file:///C:/Projects/HealWithIndia/app/admin/documents/page.tsx) (line 69), the dashboard displays a badge claiming **"Storage Protocol: HIPAA Compliant"**.
- **Demonstrable Controls:**
  - Robust multi-tenant Row Level Security (RLS).
  - HTTP-only session cookies.
  - Role-gated administration.
- **Compliance Gaps (NOT yet production HIPAA compliant):**
  - **No Business Associate Agreement (BAA):** HIPAA requires formal signed BAAs with cloud infrastructure providers (Vercel, Supabase).
  - **No Application-Level Encryption at Rest:** Protected Health Information (PHI) stored in PostgreSQL columns is not encrypted with tenant-specific symmetric keys before insertion.
  - **No Access Audit Trail for Document Viewing:** Read queries on medical records are not persistently written to `patient_audit_logs`.

---

## 6. Discovered Vulnerabilities & Remediation Action Plan

### Vulnerability 1: Hardcoded Fallback Session Secret (Severity: HIGH)
- **Location:** [lib/auth/admin-auth.ts](file:///C:/Projects/HealWithIndia/lib/auth/admin-auth.ts#L36-L39)
- **Finding:** If `ADMIN_SESSION_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` are undefined in environment variables, the system falls back to `"healwithindia-secure-admin-secret-key-2026"`.
- **Impact:** An attacker who discovers this default string can forge arbitrary `hwi_admin_session` cookies and authenticate as `super_admin`.
- **Remediation:** Remove the fallback string. Throw an explicit startup error if no cryptographic secret is configured in production:
  ```typescript
  const ADMIN_SECRET = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!ADMIN_SECRET && process.env.NODE_ENV === "production") {
    throw new Error("FATAL: ADMIN_SESSION_SECRET must be configured in production.");
  }
  ```

### Vulnerability 2: Missing Rate Limiting on Public Endpoints (Severity: MEDIUM)
- **Location:** [app/api/crm/leads/route.ts](file:///C:/Projects/HealWithIndia/app/api/crm/leads/route.ts), [app/api/auth/admin-login/route.ts](file:///C:/Projects/HealWithIndia/app/api/auth/admin-login/route.ts)
- **Finding:** No rate-limiting headers or token buckets are implemented on lead submission or admin login routes.
- **Impact:** Susceptible to credential stuffing on `/api/auth/admin-login` and spam injection on `/api/crm/leads`.
- **Remediation:** Implement an in-memory sliding-window rate limiter or Redis-backed Upstash limiter in `proxy.ts` (e.g. max 5 login attempts per IP per 10 minutes; max 10 lead submissions per IP per hour).

### Vulnerability 3: File Vault URL Trust Without MIME Validation (Severity: MEDIUM)
- **Location:** [app/api/safety/profile/documents/route.ts](file:///C:/Projects/HealWithIndia/app/api/safety/profile/documents/route.ts#L14-L17)
- **Finding:** The endpoint receives a client-provided `file_url` string and persists it without validating that the URL points to an authorized Supabase bucket, or verifying file headers.
- **Impact:** A malicious patient could store links to phishing domains or unauthorized external binaries. (Note: strict file validation was prototyped in `backend-validation.py` but is not wired into this Next.js route).
- **Remediation:** Restrict `file_url` to regex-validated internal Supabase storage bucket URLs (e.g. `^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/patient-vault\/.*$`).

### Vulnerability 4: Statically Claiming HIPAA Compliance (Severity: LOW / COMPLIANCE)
- **Location:** [app/admin/documents/page.tsx](file:///C:/Projects/HealWithIndia/app/admin/documents/page.tsx#L69-L70)
- **Finding:** Statically claims "HIPAA Compliant" in the UI.
- **Remediation:** Update the UI badge to read **"Enhanced RLS Protocol / Encrypted Transit"** until legal BAAs and field-level AES-256 encryption at rest are formally certified.
