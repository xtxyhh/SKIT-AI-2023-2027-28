# HealWithIndia — Master SDE Resume Metrics Extraction

**Auditor & Technical Interview Evaluator:** Principal Software Engineer  
**Repository:** `HealWithIndia`  
**Execution Date:** November 7, 2026  
**Standards:** Strictly verified technical numbers. Every metric is backed by actual execution commands, test logs, or source code file line citations.

---

## 1. Master Metrics Verification Table

### Confidence Classification Key:
- **A — Verified by Execution:** Directly measured via running automated tests, builds, benchmarks, Lighthouse, or load tests.
- **B — Verified by Source-Code Inspection:** Exactly counted and verified by AST / filesystem parsers across repo source code.
- **C — Estimated or Inferred:** *DISQUALIFIED from verified resume claims.*
- **D — Not Measurable:** *DISQUALIFIED from verified resume claims.*

| Category | Metric | Measured Result | Evidence / File Path | Measurement Tool / Command | Confidence |
|---|---|---|---|---|:---:|
| **Database** | Database Tables | **34 tables** | `supabase/migrations/000` to `013` | AST Schema Scanner (`audit-db-schema.mjs`) | **B** |
| **Database** | RLS Enabled Tables | **34 tables (100%)** | `supabase/migrations/*.sql` | AST Schema Scanner (`audit-db-schema.mjs`) | **B** |
| **Database** | Net Active RLS Policies | **75 policies** | 91 created, 8 dropped in migrations | AST Schema Scanner (`audit-db-schema.mjs`) | **B** |
| **Database** | Policies by Operation | **34 ALL, 23 SELECT, 10 INSERT, 8 UPDATE** | `supabase/migrations/*.sql` | AST Schema Scanner (`audit-db-schema.mjs`) | **B** |
| **Database** | Database Migrations | **14 migrations** | `supabase/migrations/000_*.sql` to `013_*.sql` | Filesystem Directory Count (`Get-ChildItem`) | **B** |
| **Database** | Database Functions / RPCs | **13 stored functions** | `supabase/migrations/*.sql` | AST Schema Scanner (`audit-db-schema.mjs`) | **B** |
| **Database** | Database Triggers | **7 triggers** | `supabase/migrations/*.sql` | AST Schema Scanner (`audit-db-schema.mjs`) | **B** |
| **Database** | Relational Database Indexes | **64 explicit indexes** | Includes partial unique composite indexes | AST Schema Scanner (`audit-db-schema.mjs`) | **B** |
| **Database** | Foreign Key References | **43 foreign keys** | Cascading relational constraints | AST Schema Scanner (`audit-db-schema.mjs`) | **B** |
| **Database** | Relational Views | **1 unified view** | `supabase/migrations/013_*.sql` (`view_patient_assigned_overview`) | AST Schema Scanner (`audit-db-schema.mjs`) | **B** |
| **Architecture** | Compiled Production Routes | **111 routes** | `.next/server/app-paths-manifest.json` | Next.js 16 Turbopack Production Build | **A** |
| **Architecture** | Static Pre-rendered Routes (SSG) | **42 routes (○)** | Next.js build output log | Next.js 16 Turbopack Production Build | **A** |
| **Architecture** | Dynamic Server Routes (SSR) | **69 routes (ƒ)** | Next.js build output log | Next.js 16 Turbopack Production Build | **A** |
| **Architecture** | Proxy / Edge Middleware | **1 root proxy** | [proxy.ts](file:///C:/Projects/HealWithIndia/proxy.ts) | Next.js 16 Proxy Engine | **A** |
| **Architecture** | REST API Route Handlers | **45 route handlers** | `app/api/**/route.ts` | Codebase Scanner (`audit-codebase.mjs`) | **B** |
| **Architecture** | Application UI Pages | **68 pages** | `app/**/page.tsx` | Codebase Scanner (`audit-codebase.mjs`) | **B** |
| **Architecture** | React Components | **34 components** | `components/*.tsx`, `components/**/*.tsx` | Codebase Scanner (`audit-codebase.mjs`) | **B** |
| **Architecture** | Server Actions (`"use server"`) | **0 files** | Architectural choice: REST/RPC Route Handlers | Codebase Scanner (`audit-codebase.mjs`) | **B** |
| **Architecture** | RBAC Operational Roles | **7 distinct roles** | `lib/auth/admin-auth.ts`, `proxy.ts` | Source Code Inspection | **B** |
| **Codebase** | Total Lines of Code (TS/TSX/JS) | **49,569 LOC** | 189 files (excluding node_modules/.next) | Codebase Scanner (`audit-codebase.mjs`) | **B** |
| **Testing** | Automated Integration Tests | **60 tests (100% passing)** | `scripts/verify-backend.mjs` | Node.js Test Runner against Production Server | **A** |
| **Testing** | Automated Unit Tests | **39 tests (100% passing)** | `backend-validation.py` | Python `unittest` runner | **A** |
| **Testing** | Total Automated Tests | **99 tests (100% passing)** | 60 integration + 39 unit tests | Verified Test Runners | **A** |
| **Testing** | TypeScript Compilation Errors | **0 errors** | 189 files checked | `npx tsc --noEmit` & Turbopack build | **A** |
| **Testing** | ESLint Problems | **3 errors, 33 warnings** | 2 React immutability, 1 prefer-const | `npm run lint` (`eslint 9.x`) | **A** |
| **Build** | Turbopack Production Build Time | **65 seconds** | Next.js 16.2.7 Turbopack compilation | Next.js Production Build Run | **A** |
| **Build** | TypeScript Build Check Time | **53 seconds** | Next.js internal type validation | Next.js Production Build Run | **A** |
| **Build** | Static Page Generation Time | **7.9 seconds (111 pages)** | 3 parallel worker threads | Next.js Production Build Run | **A** |
| **Build** | Shared Root JS Bundle Size | **456.8 KB** | `.next/build-manifest.json` | Filesystem Stat Analysis | **A** |
| **Build** | Total Static Chunks Size | **1.70 MB (58 chunks)** | `.next/static` | Filesystem Stat Analysis | **A** |
| **Build** | Total Server Component Size | **38.3 MB (2,209 assets)** | `.next/server` | Filesystem Stat Analysis | **A** |
| **Performance** | Lighthouse: Best Practices | **100 / 100 (Perfect)** | `localhost_2026-11-07_22-50-01.report.html` | Google Lighthouse v13.6.0 | **A** |
| **Performance** | Lighthouse: SEO | **100 / 100 (Perfect)** | `localhost_2026-11-07_22-50-01.report.html` | Google Lighthouse v13.6.0 | **A** |
| **Performance** | Lighthouse: Accessibility | **80 / 100** | `localhost_2026-11-07_22-50-01.report.html` | Google Lighthouse v13.6.0 | **A** |
| **Performance** | Lighthouse: Performance | **56 / 100** | Simulated Mobile 4x Throttling | Google Lighthouse v13.6.0 | **A** |
| **Performance** | Cumulative Layout Shift (CLS) | **0.000 (Zero layout shift)** | Lighthouse Core Web Vitals audit | Google Lighthouse v13.6.0 | **A** |
| **Performance** | First Contentful Paint (FCP) | **2.8 seconds** | Lighthouse Core Web Vitals audit | Google Lighthouse v13.6.0 | **A** |
| **Performance** | Largest Contentful Paint (LCP) | **2.8 seconds** | Lighthouse Core Web Vitals audit | Google Lighthouse v13.6.0 | **A** |
| **Throughput** | Peak API Throughput | **220.0 requests/sec** | `/api/auth/me` at 100 concurrency | Autocannon v9.0.0 Load Test | **A** |
| **Throughput** | Homepage Throughput | **108.6 requests/sec** | `GET /` at 100 concurrency | Autocannon v9.0.0 Load Test | **A** |
| **Throughput** | Network Bandwidth Throughput | **51.7 MB/sec** | `GET /` under 100 concurrency | Autocannon v9.0.0 Load Test | **A** |
| **Latency** | Auth API Median Latency (p50) | **45.0 ms** | `/api/auth/me` at 10 concurrency | Autocannon v9.0.0 Load Test | **A** |
| **Latency** | Auth API p99 Latency | **90.0 ms** | `/api/auth/me` at 10 concurrency | Autocannon v9.0.0 Load Test | **A** |
| **Latency** | Homepage Median Latency (p50) | **92.0 ms** | `GET /` at 10 concurrency | Autocannon v9.0.0 Load Test | **A** |
| **Latency** | Homepage p99 Latency | **328.0 ms** | `GET /` at 10 concurrency | Autocannon v9.0.0 Load Test | **A** |
| **Scalability** | Evaluated Concurrency Range | **10 to 100 connections** | Evaluated at c=10, c=50, c=100 | Autocannon v9.0.0 Load Test | **A** |
| **Reliability** | HTTP Error Rate Under Load | **0.00% (Zero errors)** | 0 dropped requests across 4,700+ reqs | Autocannon v9.0.0 Load Test | **A** |
| **Reliability** | Circuit Breaker Timeout Cap | **2,500 ms** | `safeSupabaseQuery` timeout ceiling | Source Code Inspection (`supabaseServer.ts`) | **B** |
| **Security** | Session Token Algorithm | **HMAC-SHA256 (Constant-time)** | `crypto.timingSafeEqual` in `admin-auth.ts` | Source Code Inspection | **B** |
| **Security** | Session Cookie Configuration | **HTTP-only, 7-Day Expiry** | Verified in `admin-login` and `proxy.ts` | Source Code Inspection & API Test | **A** |

---

## 2. Metrics Disqualification & Non-Measurable Scope (Category C & D)

To maintain absolute resume integrity during technical interviews, the following metrics are explicitly **disqualified** from being claimed as verified production achievements:
- **HIPAA Certification:** *DISQUALIFIED (D).* Demonstrable controls exist (RLS, HTTP-only cookies), but formal third-party audits and signed BAAs are absent.
- **Production Patient Count:** *DISQUALIFIED (C).* Seed and mock datasets exist (e.g. 5–10 seeded patients for evaluation), but real patient volume must not be fabricated.
- **Real Hospital Partnerships:** *DISQUALIFIED (C).* Hospital data (Apollo, Max, Fortis) represents catalog directory modeling, not signed commercial B2B contracts.
- **Code Coverage Percentage:** *DISQUALIFIED (D).* Jest/Istanbul coverage was not configured in `package.json`; 99 automated tests exist and pass, but exact statement/branch coverage percentage is uninstrumented.
