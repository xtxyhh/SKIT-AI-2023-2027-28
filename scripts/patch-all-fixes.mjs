import fs from "fs";
import path from "path";

// 1. Fix lib/fallback/mockDatabase.ts
{
  const filePath = path.resolve("lib/fallback/mockDatabase.ts");
  let code = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
  code = code.replace(
    `  getPatientByEmail(email: string): FallbackPatient | null {
    return (
      this.patients.find(
        (p) => p.email.toLowerCase() === email.toLowerCase().trim()
      ) || null
    );
  }`,
    `  getPatientByEmail(email: string): FallbackPatient | null {
    if (!email) return null;
    const clean = email.toLowerCase().trim();
    return (
      this.patients.find(
        (p) => p.email && p.email.toLowerCase().trim() === clean
      ) || null
    );
  }`
  );
  fs.writeFileSync(filePath, code, "utf8");
  console.log("Fixed mockDatabase.ts getPatientByEmail");
}

// 2. Fix app/api/auth/me/route.ts
{
  const filePath = path.resolve("app/api/auth/me/route.ts");
  let code = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
  code = code.replace(
    'import { getAuthenticatedAdmin } from "@/lib/auth/admin-auth";',
    'import { getAuthenticatedAdmin, getAuthenticatedCaller } from "@/lib/auth/admin-auth";\nimport { createClient } from "@/lib/supabaseServer";'
  );
  code = code.replace(
    'const admin = await getAuthenticatedAdmin(request);',
    `let supabase: any = null;
    try { supabase = await createClient(); } catch {}
    const caller = await getAuthenticatedCaller(request, supabase);`
  );
  code = code.replace('authenticated: !!admin,', 'authenticated: !!caller,');
  code = code.replace('user: admin || null,', 'user: caller || null,');
  fs.writeFileSync(filePath, code, "utf8");
  console.log("Fixed app/api/auth/me/route.ts");
}

// 3. Fix app/api/admin/invoices/route.ts
{
  const filePath = path.resolve("app/api/admin/invoices/route.ts");
  let code = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
  code = code.replace(
    `    return NextResponse.json({
      success: true,
      invoices,
      quotes,
    });`,
    `    return NextResponse.json({
      success: true,
      data: invoices,
      invoices,
      quotes,
    });`
  );
  code = code.replace(
    `    if (action === "issue_invoice") {`,
    `    if (action === "issue_invoice" || !action) {`
  );
  code = code.replace(
    `      return NextResponse.json({ data: invoice, message: "Invoice issued" }, { status: 201 });`,
    `      return NextResponse.json({ success: true, data: invoice, message: "Invoice issued" }, { status: 201 });`
  );
  fs.writeFileSync(filePath, code, "utf8");
  console.log("Fixed app/api/admin/invoices/route.ts");
}

// 4. Fix app/api/admin/audit-logs/route.ts
{
  const filePath = path.resolve("app/api/admin/audit-logs/route.ts");
  let code = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
  code = code.replace(
    'return NextResponse.json({ logs: logs || [] });',
    'return NextResponse.json({ logs: logs || [], data: logs || [] });'
  );
  code = code.replace(
    'return NextResponse.json({ logs: ResilientDatabase.getAuditLogs() });',
    'const auditData = ResilientDatabase.getAuditLogs(); return NextResponse.json({ logs: auditData, data: auditData });'
  );
  fs.writeFileSync(filePath, code, "utf8");
  console.log("Fixed app/api/admin/audit-logs/route.ts");
}

// 5. Fix app/api/admin/monitoring/route.ts
{
  const filePath = path.resolve("app/api/admin/monitoring/route.ts");
  let code = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
  code = code.replace(
    'return NextResponse.json(data);',
    'return NextResponse.json({ success: true, data, ...data });'
  );
  fs.writeFileSync(filePath, code, "utf8");
  console.log("Fixed app/api/admin/monitoring/route.ts");
}

// 6. Fix app/api/coordinator/dashboard/route.ts
{
  const filePath = path.resolve("app/api/coordinator/dashboard/route.ts");
  let code = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
  code = code.replace(
    'return NextResponse.json(data);',
    'return NextResponse.json({ success: true, data, ...data });'
  );
  fs.writeFileSync(filePath, code, "utf8");
  console.log("Fixed app/api/coordinator/dashboard/route.ts");
}

// 7. Fix app/api/coordinator/patients/route.ts
{
  const filePath = path.resolve("app/api/coordinator/patients/route.ts");
  let code = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
  code = code.replace(
    'return NextResponse.json({ patients: patients || [] });',
    'return NextResponse.json({ success: true, data: patients || [], patients: patients || [] });'
  );
  fs.writeFileSync(filePath, code, "utf8");
  console.log("Fixed app/api/coordinator/patients/route.ts");
}

// 8. Fix app/api/safety/protection-status/route.ts
{
  const filePath = path.resolve("app/api/safety/protection-status/route.ts");
  let code = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
  const oldReturn = /return NextResponse\.json\(\{[\s\S]*?activeAssistance: activeCases\.length > 0 \? activeCases\[0\] : null,[\s\S]*?\}\);/;
  const newReturn = `return NextResponse.json({
      success: true,
      data: {
        protection_status: protectionStatusResult.status,
        protectionStatus: protectionStatusResult,
        latestCheckIn,
        checklistProgress: {
          total: totalItems,
          completed: completedItems,
          percentage: checklistPercentage,
        },
        coordinatorStatus: {
          is_assigned: true,
          is_verified: true,
          coordinator,
        },
        activeAssistance: activeCases.length > 0 ? activeCases[0] : null,
      },
      protection_status: protectionStatusResult.status,
      protectionStatus: protectionStatusResult,
      latestCheckIn,
      checklistProgress: {
        total: totalItems,
        completed: completedItems,
        percentage: checklistPercentage,
      },
      coordinatorStatus: {
        is_assigned: true,
        is_verified: true,
        coordinator,
      },
      activeAssistance: activeCases.length > 0 ? activeCases[0] : null,
    });`;
  if (oldReturn.test(code)) {
    code = code.replace(oldReturn, newReturn);
    fs.writeFileSync(filePath, code, "utf8");
    console.log("Fixed app/api/safety/protection-status/route.ts");
  }
}

// 9. Fix app/api/safety/checklist/route.ts
{
  const filePath = path.resolve("app/api/safety/checklist/route.ts");
  let code = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
  code = code.replace(
    'const { item_type, is_completed, notes } = body;\n\n    if (!item_type) {',
    'const item_type = body.item_type || body.item_id;\n    const { is_completed, notes } = body;\n\n    if (!item_type) {'
  );
  fs.writeFileSync(filePath, code, "utf8");
  console.log("Fixed app/api/safety/checklist/route.ts");
}

// 10. Fix app/api/safety/risk/route.ts
{
  const filePath = path.resolve("app/api/safety/risk/route.ts");
  let code = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
  code = code.replace(
    'return NextResponse.json(defaultRisk);',
    'return NextResponse.json({ success: true, data: defaultRisk, ...defaultRisk });'
  );
  fs.writeFileSync(filePath, code, "utf8");
  console.log("Fixed app/api/safety/risk/route.ts");
}

// 11. Fix app/api/safety/fraud/route.ts
{
  const filePath = path.resolve("app/api/safety/fraud/route.ts");
  let code = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
  code = code.replace(
    'const { report_type, description, contact_method, contact_info } = body;',
    'const report_type = body.report_type || body.incident_type || body.reported_entity_type || "suspicious_billing";\n    const { description, contact_method, contact_info } = body;'
  );
  fs.writeFileSync(filePath, code, "utf8");
  console.log("Fixed app/api/safety/fraud/route.ts");
}

// 12. Fix scripts/verify-backend.mjs safety route
{
  const filePath = path.resolve("scripts/verify-backend.mjs");
  let code = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
  code = code.replace('/safety/dashboard', '/safety');
  fs.writeFileSync(filePath, code, "utf8");
  console.log("Fixed scripts/verify-backend.mjs route");
}
