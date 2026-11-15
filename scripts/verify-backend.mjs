/**
 * Comprehensive Backend & Server Verification Test Suite for HealWithIndia
 * Tests:
 * - Admin Authentication (Login, Session Check, Logout)
 * - Patient Authentication (Demo Login, Session Check, Logout)
 * - Catalog APIs (Doctors, Hospitals, Treatments)
 * - CRM & Leads APIs (Public Lead Submission, Status Update, CRM Query)
 * - Admin Operation APIs (Invoices, Assignments, Patients, Coordinators, Monitoring, Audits)
 * - Coordinator APIs (Dashboard, Patients, Status Update)
 * - Patient Portal APIs (Dashboard, Journey, Travel, Invoices)
 * - Safety Operations APIs (Profile, Status, Check-ins, Checklist, Cases, Risk, Fraud)
 * - Key Server Component Web Pages (Admin, Patient, Coordinator, Safety)
 */

import http from "http";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

let adminCookie = "";
let patientCookie = "";

const results = {
  passed: 0,
  failed: 0,
  tests: [],
};

function logTest(name, passed, detail = "") {
  if (passed) {
    results.passed++;
    console.log(`  \x1b[32m✔\x1b[0m ${name}`);
    results.tests.push({ name, status: "PASS", detail });
  } else {
    results.failed++;
    console.error(`  \x1b[31m✖\x1b[0m ${name} — ${detail}`);
    results.tests.push({ name, status: "FAIL", detail });
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const method = options.method || "GET";
  const headers = {
    "x-bypass-rate-limit": "true",
    ...options.headers,
  };

  if (options.auth === "admin" && adminCookie) {
    headers["Cookie"] = adminCookie;
  } else if (options.auth === "patient" && patientCookie) {
    headers["Cookie"] = patientCookie;
  }

  let body = options.body;
  if (body && typeof body === "object") {
    body = JSON.stringify(body);
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method,
    headers,
    body,
    redirect: "manual",
  });

  const setCookie = res.headers.get("set-cookie");
  let data = null;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      data = await res.json();
    } catch {}
  } else {
    data = await res.text();
  }

  return { status: res.status, headers: res.headers, data, setCookie };
}

async function runAllTests() {
  console.log("\n=======================================================");
  console.log("   HEALWITHINDIA COMPREHENSIVE BACKEND VERIFICATION");
  console.log(`   Target Server: ${BASE_URL}`);
  console.log("=======================================================\n");

  // 1. PUBLIC & AUTH TESTS
  console.log("--- 1. Authentication & Session Lifecycles ---");

  // Me unauthenticated
  {
    const res = await request("/api/auth/me");
    logTest("GET /api/auth/me (Unauthenticated)", res.status === 200 && res.data?.authenticated === false);
  }

  // Admin Login
  {
    const res = await request("/api/auth/admin-login", {
      method: "POST",
      body: { email: "admin@healwithindia.com", password: "admin123" },
    });
    const success = res.status === 200 && res.data?.user?.is_staff === true;
    if (res.setCookie) {
      adminCookie = res.setCookie.split(";")[0];
    }
    logTest("POST /api/auth/admin-login (Default Admin)", success && !!adminCookie);
  }

  // Me authenticated as Admin
  {
    const res = await request("/api/auth/me", { auth: "admin" });
    const success = res.status === 200 && res.data?.authenticated === true && res.data?.user?.is_staff === true;
    logTest("GET /api/auth/me (Admin Session Cookie)", success);
  }

  // Patient Login (Demo 1-Click)
  {
    const res = await request("/api/auth/patient-login", {
      method: "POST",
      body: { email: "patient@healwithindia.com", password: "patient123" },
    });
    const success = res.status === 200 && res.data?.user?.role === "patient";
    if (res.setCookie) {
      patientCookie = res.setCookie.split(";")[0];
    }
    logTest("POST /api/auth/patient-login (Demo Patient)", success && !!patientCookie);
  }

  // Me authenticated as Patient
  {
    const res = await request("/api/auth/me", { auth: "patient" });
    const success = res.status === 200 && res.data?.authenticated === true && res.data?.user?.is_patient === true;
    logTest("GET /api/auth/me (Patient Session Cookie)", success);
  }

  // 2. CATALOG APIS
  console.log("\n--- 2. Medical Catalog & Directory APIs ---");

  // Doctors GET
  {
    const res = await request("/api/doctors");
    const count = Array.isArray(res.data?.data) ? res.data.data.length : 0;
    logTest("GET /api/doctors (Public Directory)", res.status === 200 && count > 0, `Returned ${count} doctors`);
  }

  // Doctors POST (Admin)
  {
    const res = await request("/api/doctors", {
      method: "POST",
      auth: "admin",
      body: {
        full_name: "Dr. Rajiv Singhal",
        specialty: "Orthopedic Surgery",
        qualification: "MBBS, MS (Ortho)",
        experience_years: 18,
        rating: 4.9,
      },
    });
    logTest("POST /api/doctors (Admin Create)", res.status === 201 && res.data?.data?.full_name === "Dr. Rajiv Singhal");
  }

  // Hospitals GET
  {
    const res = await request("/api/hospitals");
    const count = Array.isArray(res.data?.data) ? res.data.data.length : 0;
    logTest("GET /api/hospitals (Public Directory)", res.status === 200 && count > 0, `Returned ${count} hospitals`);
  }

  // Hospitals POST (Admin)
  {
    const res = await request("/api/hospitals", {
      method: "POST",
      auth: "admin",
      body: {
        name: "Max Super Speciality Hospital",
        city: "Saket, New Delhi",
        state: "Delhi",
        country: "India",
        accreditation: "JCI & NABH",
        rating: 4.8,
        bed_count: 530,
      },
    });
    logTest("POST /api/hospitals (Admin Create)", res.status === 201 && !!res.data?.data?.name);
  }

  // Treatments GET
  {
    const res = await request("/api/treatments");
    const count = Array.isArray(res.data?.data) ? res.data.data.length : 0;
    logTest("GET /api/treatments (Public Directory)", res.status === 200 && count > 0, `Returned ${count} treatments`);
  }

  // 3. CRM & LEADS APIS
  console.log("\n--- 3. CRM, Inquiries & Lead Management APIs ---");

  // Public Lead submission
  {
    const res = await request("/api/crm/leads", {
      method: "POST",
      body: {
        patient_name: "Amira Hassan",
        email: "amira.hassan@example.com",
        phone: "+971 55 987 6543",
        country: "United Arab Emirates",
        treatment_requested: "Robotic Knee Replacement",
        notes: "Requesting consultation for bilateral knee pain.",
        source: "website_consultation",
      },
    });
    logTest("POST /api/crm/leads (Public Consultation Lead)", res.status === 201 && res.data?.success === true);
  }

  // Admin Leads GET
  {
    const res = await request("/api/crm/leads", { auth: "admin" });
    const count = Array.isArray(res.data?.data) ? res.data.data.length : 0;
    logTest("GET /api/crm/leads (Admin CRM Query)", res.status === 200 && count > 0, `Returned ${count} leads`);
  }

  // Update Status
  {
    const res = await request("/api/update-status", {
      method: "POST",
      auth: "admin",
      body: { id: 1, status: "Hospital Assigned" },
    });
    logTest("POST /api/update-status (Status Pipeline)", res.status === 200 && res.data?.success === true);
  }

  // 4. ADMIN OPERATIONS & FINANCIALS
  console.log("\n--- 4. Admin Management, Assignments & Safety Operations ---");

  // Invoices GET & POST
  {
    const resGet = await request("/api/admin/invoices", { auth: "admin" });
    logTest("GET /api/admin/invoices", resGet.status === 200 && Array.isArray(resGet.data?.data));

    const resPost = await request("/api/admin/invoices", {
      method: "POST",
      auth: "admin",
      body: {
        patient_id: 1,
        invoice_number: `INV-2026-${Date.now().toString().slice(-4)}`,
        amount_usd: 8500,
        tax_usd: 425,
        total_usd: 8925,
        status: "UNPAID",
      },
    });
    logTest("POST /api/admin/invoices (Create Invoice)", resPost.status === 201 && resPost.data?.success === true);
  }

  // Patient Assignments
  {
    const res = await request("/api/admin/patient/assignments?patient_id=1", { auth: "admin" });
    logTest("GET /api/admin/patient/assignments?patient_id=1", res.status === 200 && !!res.data?.data);
  }

  // Patient Create
  {
    const res = await request("/api/admin/patient/create", {
      method: "POST",
      auth: "admin",
      body: {
        full_name: "Fatima Al-Zahra",
        email: `fatima.${Date.now()}@example.ae`,
        phone: "+971 50 888 7777",
        country: "United Arab Emirates",
        treatment: "Cardiac Valve Replacement",
        status: "New",
      },
    });
    logTest("POST /api/admin/patient/create (Admin Create Patient)", res.status === 201 && res.data?.success === true);
  }

  // Patient Financials
  {
    const res = await request("/api/admin/patient/financials", {
      method: "POST",
      auth: "admin",
      body: {
        patient_id: 1,
        estimated_cost: 9500,
        paid_amount: 4000,
        currency: "USD",
        invoice_status: "PARTIALLY_PAID",
      },
    });
    logTest("POST /api/admin/patient/financials (Update Financials)", res.status === 200 && res.data?.success === true);
  }

  // Coordinators GET, POST, PATCH
  {
    const resGet = await request("/api/admin/coordinator", { auth: "admin" });
    logTest("GET /api/admin/coordinator", resGet.status === 200 && Array.isArray(resGet.data?.data));

    const resPost = await request("/api/admin/coordinator", {
      method: "POST",
      auth: "admin",
      body: {
        full_name: "Kavita Rao",
        email: `kavita.${Date.now()}@healwithindia.com`,
        phone: "+91 98112 34567",
        assigned_region: "South India (Bengaluru/Chennai)",
      },
    });
    logTest("POST /api/admin/coordinator (Create Coordinator)", resPost.status === 201 && !!resPost.data?.data?.reference_id);

    const resPatch = await request("/api/admin/coordinator", {
      method: "PATCH",
      auth: "admin",
      body: {
        id: "HWI-COORD-001",
        is_active: true,
      },
    });
    logTest("PATCH /api/admin/coordinator (Update Coordinator)", resPatch.status === 200 && resPatch.data?.success === true);
  }

  // Monitoring & Audit Logs
  {
    const resMon = await request("/api/admin/monitoring", { auth: "admin" });
    logTest("GET /api/admin/monitoring (Operations Intelligence)", resMon.status === 200 && !!resMon.data?.data?.overview);

    const resAudit = await request("/api/admin/audit-logs", { auth: "admin" });
    logTest("GET /api/admin/audit-logs", resAudit.status === 200 && Array.isArray(resAudit.data?.data));
  }

  // Safety Cases
  {
    const resCase = await request("/api/admin/safety/cases/case-001", { auth: "admin" });
    logTest("GET /api/admin/safety/cases/[id]", resCase.status === 200 && !!resCase.data?.data);

    const resResp = await request("/api/admin/safety/cases/case-001/response", {
      method: "POST",
      auth: "admin",
      body: {
        action: "escalate",
        notes: "Assigned senior bilingual coordinator for urgent hospital coordination.",
      },
    });
    logTest("POST /api/admin/safety/cases/[id]/response", resResp.status === 200 && resResp.data?.success === true);
  }

  // 5. COORDINATOR PORTAL APIS
  console.log("\n--- 5. Coordinator Operations APIs ---");
  {
    const resDash = await request("/api/coordinator/dashboard", { auth: "admin" });
    logTest("GET /api/coordinator/dashboard", resDash.status === 200 && resDash.data?.success === true);

    const resPatients = await request("/api/coordinator/patients", { auth: "admin" });
    logTest("GET /api/coordinator/patients", resPatients.status === 200 && Array.isArray(resPatients.data?.data));

    const resPatch = await request("/api/coordinator/patients", {
      method: "PATCH",
      auth: "admin",
      body: {
        patient_id: 1,
        journey_stage: "consultation_scheduled",
        status: "Consultation",
      },
    });
    logTest("PATCH /api/coordinator/patients", resPatch.status === 200 && resPatch.data?.success === true);
  }

  // 6. PATIENT PORTAL APIS
  console.log("\n--- 6. Patient Portal APIs ---");
  {
    const resDash = await request("/api/patient/dashboard", { auth: "patient" });
    logTest("GET /api/patient/dashboard", resDash.status === 200 && !!resDash.data?.data?.patient);

    const resJourney = await request("/api/patient/journey", { auth: "patient" });
    logTest("GET /api/patient/journey", resJourney.status === 200 && Array.isArray(resJourney.data?.data));

    const resTravel = await request("/api/patient/travel", { auth: "patient" });
    logTest("GET /api/patient/travel", resTravel.status === 200 && !!resTravel.data?.data);

    const resInvoices = await request("/api/patient/invoices", { auth: "patient" });
    logTest("GET /api/patient/invoices", resInvoices.status === 200 && Array.isArray(resInvoices.data?.data?.invoices));

    const resPay = await request("/api/patient/invoices", {
      method: "POST",
      auth: "patient",
      body: {
        invoice_id: 1,
        amount: 2500,
        payment_method: "CARD",
      },
    });
    logTest("POST /api/patient/invoices (Record Payment)", resPay.status === 200 && resPay.data?.success === true);
  }

  // 7. SAFETY LIFECYCLE APIS
  console.log("\n--- 7. Smart Tourist Protection & Safety APIs ---");
  {
    const resProf = await request("/api/safety/profile?patient_id=1", { auth: "patient" });
    logTest("GET /api/safety/profile", resProf.status === 200 && !!resProf.data?.data);

    const resProt = await request("/api/safety/protection-status?patient_id=1", { auth: "patient" });
    logTest("GET /api/safety/protection-status", resProt.status === 200 && !!resProt.data?.data?.protection_status);

    const resCoord = await request("/api/safety/coordinator?patient_id=1", { auth: "patient" });
    logTest("GET /api/safety/coordinator", resCoord.status === 200 && !!resCoord.data?.data);

    const resCheckins = await request("/api/safety/check-ins?patient_id=1", { auth: "patient" });
    logTest("GET /api/safety/check-ins", resCheckins.status === 200 && Array.isArray(resCheckins.data?.data));

    const resCheckinPost = await request("/api/safety/check-ins", {
      method: "POST",
      auth: "patient",
      body: {
        patient_id: 1,
        journey_stage: "in_transit",
        check_in_type: "scheduled",
        status: "completed",
        patient_notes: "Arrived safely in New Delhi. Meeting coordinator at hospital tomorrow.",
      },
    });
    logTest("POST /api/safety/check-ins", resCheckinPost.status === 201 && resCheckinPost.data?.success === true);

    const resChecklist = await request("/api/safety/checklist?patient_id=1", { auth: "patient" });
    logTest("GET /api/safety/checklist", resChecklist.status === 200 && Array.isArray(resChecklist.data?.data));

    const resChecklistPost = await request("/api/safety/checklist", {
      method: "POST",
      auth: "patient",
      body: {
        item_id: "chk-001",
        patient_id: 1,
        is_completed: true,
      },
    });
    logTest("POST /api/safety/checklist", resChecklistPost.status === 200 && resChecklistPost.data?.success === true);

    const resCases = await request("/api/safety/cases?patient_id=1", { auth: "patient" });
    logTest("GET /api/safety/cases", resCases.status === 200 && Array.isArray(resCases.data?.data));

    const resCasesPost = await request("/api/safety/cases", {
      method: "POST",
      auth: "patient",
      body: {
        patient_id: 1,
        category: "coordinator_assistance",
        priority: "medium",
        description: "Need language translation assistance for scheduled surgery briefing.",
      },
    });
    logTest("POST /api/safety/cases (Urgent Request)", resCasesPost.status === 201 && resCasesPost.data?.success === true);

    const resRisk = await request("/api/safety/risk?patient_id=1", { auth: "patient" });
    logTest("GET /api/safety/risk", resRisk.status === 200 && !!resRisk.data?.data?.risk_level);

    const resFraud = await request("/api/safety/fraud", {
      method: "POST",
      auth: "patient",
      body: {
        patient_id: 1,
        reported_entity_type: "hospital_billing",
        reported_entity_name: "Hospital Pharmacy Counter",
        incident_type: "unauthorized_fee",
        description: "Encountered unauthorized auxiliary charge not listed on estimate quote.",
      },
    });
    logTest("POST /api/safety/fraud (Report Fraud)", resFraud.status === 201 && resFraud.data?.success === true);
  }

  // 8. SERVER COMPONENT WEBPAGES
  console.log("\n--- 8. Server Component Pages & Portals Rendering ---");
  {
    const pages = [
      { path: "/", auth: "none", name: "Landing Page (Public)" },
      { path: "/admin/login", auth: "none", name: "Admin Login Page" },
      { path: "/patient-login", auth: "none", name: "Patient Login Page" },
      { path: "/admin", auth: "admin", name: "Admin Dashboard Page" },
      { path: "/admin/patient", auth: "admin", name: "Admin Patients Directory Page" },
      { path: "/admin/patient/1", auth: "admin", name: "Admin Patient Profile [id] Page" },
      { path: "/admin/safety", auth: "admin", name: "Admin Safety Operations Page" },
      { path: "/admin/documents", auth: "admin", name: "Admin Documents Page" },
      { path: "/admin/revenue", auth: "admin", name: "Admin Revenue Page" },
      { path: "/admin/followups", auth: "admin", name: "Admin Followups Page" },
      { path: "/admin/employees", auth: "admin", name: "Admin Employees Page" },
      { path: "/patient/dashboard", auth: "patient", name: "Patient Portal Dashboard" },
      { path: "/coordinator/dashboard", auth: "admin", name: "Coordinator Dashboard" },
      { path: "/safety", auth: "patient", name: "Patient Safety Dashboard" },
    ];

    for (const page of pages) {
      const res = await request(page.path, { auth: page.auth });
      const ok = res.status === 200 && typeof res.data === "string" && res.data.length > 50;
      logTest(`GET ${page.path} [${page.name}]`, ok, `Status: ${res.status}`);
    }
  }

  // 9. LOGOUT VERIFICATION
  console.log("\n--- 9. Session Termination & Clean Logouts ---");
  {
    const resAdminOut = await request("/api/auth/admin-logout", { method: "POST", auth: "admin" });
    logTest("POST /api/auth/admin-logout", resAdminOut.status === 200 && resAdminOut.data?.success === true);

    const resPatientOut = await request("/api/auth/patient-logout", { method: "POST", auth: "patient" });
    logTest("POST /api/auth/patient-logout", resPatientOut.status === 200 && resPatientOut.data?.success === true);
  }

  // SUMMARY
  console.log("\n=======================================================");
  console.log(`TOTAL TESTS: ${results.passed + results.failed}`);
  console.log(`PASSED: \x1b[32m${results.passed}\x1b[0m`);
  console.log(`FAILED: \x1b[31m${results.failed}\x1b[0m`);
  console.log("=======================================================\n");

  if (results.failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
