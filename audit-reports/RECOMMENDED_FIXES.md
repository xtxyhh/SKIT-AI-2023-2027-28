# HealWithIndia — Prioritized Engineering Remediation & Architecture Fixes

**Author:** Principal Software Engineer & Systems Architect  
**Repository:** `HealWithIndia`  
**Execution Date:** November 7, 2026  
**Purpose:** Actionable, prioritized code fixes to harden security, optimize latency, eliminate ESLint errors, and elevate the codebase to enterprise production standards.

---

## 1. Prioritized Roadmap Overview

| Priority | Category | Issue Description | Impact | Target File |
|:---:|---|---|---|---|
| **P0** | **Security** | Hardcoded session secret fallback | Potential token forgery if env vars missing | `lib/auth/admin-auth.ts` |
| **P0** | **Security** | Missing API rate limiting | Credential stuffing & inquiry spam | `proxy.ts` / API handlers |
| **P0** | **Security** | Unvalidated document URLs | Arbitrary external link injection into patient records | `app/api/safety/profile/documents/route.ts` |
| **P1** | **Performance** | Stateless circuit-breaker latency | 2.5s network timeout overhead on offline cloud | `lib/supabaseServer.ts` |
| **P1** | **Code Quality** | 3 ESLint compile errors | Violations of React immutability & `prefer-const` | `app/admin/patient/[id]`, `app/admin/safety`, `api/coordinator` |
| **P2** | **Compliance** | Unverified HIPAA badge in UI | Legal compliance risk / misleading marketing | `app/admin/documents/page.tsx` |
| **P2** | **Validation** | Lack of runtime schema validation | Request body type inconsistency risks | Route Handlers (`app/api/*`) |
| **P2** | **Testing** | CI test instrumentation missing | Automated test suites not hooked into `npm test` | `package.json` |

---

## 2. P0: Critical Security Remediations

### Fix P0.1: Remove Hardcoded Secret Fallback
- **File:** [lib/auth/admin-auth.ts](file:///C:/Projects/HealWithIndia/lib/auth/admin-auth.ts#L36-L40)
- **Problem:** When `ADMIN_SESSION_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` are not set in environment variables, the codebase falls back to `"healwithindia-secure-admin-secret-key-2026"`.
- **Remediation:** Enforce environment variable presence. In production, throw immediately on startup:
```typescript
// Replace lines 36-40 in lib/auth/admin-auth.ts:
const ADMIN_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!ADMIN_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "FATAL SECURITY ERROR: ADMIN_SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY must be set in production."
    );
  }
}

// Fallback permitted ONLY in explicit local development/testing:
const EFFECTIVE_SECRET =
  ADMIN_SECRET || "hwi-dev-local-only-insecure-secret-" + Date.now();
```

---

### Fix P0.2: Implement Edge Rate Limiting in `proxy.ts`
- **File:** [proxy.ts](file:///C:/Projects/HealWithIndia/proxy.ts)
- **Problem:** Public consultation leads (`/api/crm/leads`) and login endpoints (`/api/auth/admin-login`) lack rate limiting, exposing the service to bot automated submissions.
- **Remediation:** Add an in-memory sliding-window rate limiter in `proxy.ts` (or Upstash Redis in serverless):
```typescript
// In proxy.ts:
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }

  if (record.count >= limit) {
    return true;
  }

  record.count++;
  return false;
}

// Inside export async function proxy(request: NextRequest):
const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

if (request.nextUrl.pathname === "/api/auth/admin-login") {
  // Max 5 attempts per 10 minutes
  if (isRateLimited(clientIp, 5, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many login attempts. Please wait 10 minutes." }, { status: 429 });
  }
}
```

---

### Fix P0.3: Restrict File URLs to Authorized Storage Domains
- **File:** [app/api/safety/profile/documents/route.ts](file:///C:/Projects/HealWithIndia/app/api/safety/profile/documents/route.ts#L13-L17)
- **Problem:** Endpoint accepts arbitrary `file_url` strings from client payloads and saves them to the patient database record.
- **Remediation:** Validate that `file_url` strictly matches approved Supabase Storage origins:
```typescript
// Add URL validation before saving:
const SUPABASE_STORAGE_REGEX = /^https:\/\/[a-z0-9_-]+\.supabase\.co\/storage\/v1\/object\/(public|authenticated)\/patient-vault\/[a-zA-Z0-9_.-]+$/;

if (!SUPABASE_STORAGE_REGEX.test(file_url)) {
  return NextResponse.json(
    { error: "Invalid file URL: Documents must reside in the authorized patient storage vault." },
    { status: 400 }
  );
}
```

---

## 3. P1: Performance & Code Quality Fixes

### Fix P1.1: Implement Stateful Circuit Breaker in `safeSupabaseQuery`
- **File:** [lib/supabaseServer.ts](file:///C:/Projects/HealWithIndia/lib/supabaseServer.ts#L40-L61)
- **Problem:** When the cloud database is paused or offline, every query waits the full 2,500 ms timeout before serving fallback data.
- **Remediation:** Add circuit state tracking (`CLOSED`, `OPEN`, `HALF_OPEN`). After 3 consecutive timeouts, trip to `OPEN` for 60 seconds to serve fallback in **< 1 ms**:
```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
  private readonly threshold = 3;
  private readonly cooldown = 60000; // 60 seconds

  public isOpen(): boolean {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime > this.cooldown) {
        this.state = "HALF_OPEN";
        return false;
      }
      return true;
    }
    return false;
  }

  public recordSuccess() {
    this.failures = 0;
    this.state = "CLOSED";
  }

  public recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.threshold) {
      this.state = "OPEN";
    }
  }
}

const dbCircuitBreaker = new CircuitBreaker();

export async function safeSupabaseQuery<T>(
  queryPromise: Promise<{ data: any; error: any } | any>,
  fallbackValue: T,
  timeoutMs: number = 2500
): Promise<{ data: T; isFallback: boolean; error: any }> {
  if (dbCircuitBreaker.isOpen()) {
    return { data: fallbackValue, isFallback: true, error: null };
  }

  try {
    const timeout = new Promise<{ data: any; error: any }>((_, reject) =>
      setTimeout(() => reject(new Error("Supabase query timeout")), timeoutMs)
    );
    const result: any = await Promise.race([queryPromise, timeout]);

    if (!result || result.error || !result.data) {
      dbCircuitBreaker.recordFailure();
      return { data: fallbackValue, isFallback: true, error: result?.error || null };
    }
    dbCircuitBreaker.recordSuccess();
    return { data: result.data as T, isFallback: false, error: null };
  } catch (err) {
    dbCircuitBreaker.recordFailure();
    return { data: fallbackValue, isFallback: true, error: err };
  }
}
```

---

### Fix P1.2: Resolve 3 ESLint Compilation Errors
ESLint 9 reported 3 errors during audit:

1. **`app/admin/patient/[id]/page.tsx:104:17`**
   - *Error:* `Cannot reassign variable in async function` (`react-hooks/immutability`).
   - *Fix:* Replace outer variable reassignment (`let patient = ...; patient = rawP`) with React state hook (`const [patient, setPatient] = useState(...)`).

2. **`app/admin/safety/page.tsx:101:38`**
   - *Error:* `Cannot reassign variable in async function` (`react-hooks/immutability`).
   - *Fix:* Replace outer variable reassignment (`monitoringData = monData`) with `setMonitoringData(monData)`.

3. **`app/api/coordinator/dashboard/route.ts:33:9`**
   - *Error:* `'data' is never reassigned. Use 'const' instead` (`prefer-const`).
   - *Fix:* Change line 33 from `let data = ...` to `const data = ...`.

---

## 4. P2: Compliance, Input Validation & Test Automation

### Fix P2.1: Update Regulatory UI Badge
- **File:** [app/admin/documents/page.tsx](file:///C:/Projects/HealWithIndia/app/admin/documents/page.tsx#L69-L70)
- **Change:**
```tsx
{/* Replace: */}
<h2 className="text-2xl font-bold mt-2 text-green-400">HIPAA Compliant</h2>

{/* With: */}
<h2 className="text-2xl font-bold mt-2 text-green-400">Encrypted Transit & RLS</h2>
```

### Fix P2.2: Add Zod Request Body Validation
- **Package:** `npm install zod`
- **Application:** Create input schemas for `POST /api/crm/leads`, `POST /api/safety/check-ins`, `POST /api/safety/cases` to strictly enforce data types, email formats, and string lengths before database insertion.

### Fix P2.3: Wire Verification Suite into `package.json`
- **File:** [package.json](file:///C:/Projects/HealWithIndia/package.json)
- **Update scripts:**
```json
{
  "scripts": {
    "dev": "next dev --webpack",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test:integration": "node scripts/verify-backend.mjs",
    "test:unit": "python -m unittest backend-validation.py",
    "test": "npm run test:integration"
  }
}
```
