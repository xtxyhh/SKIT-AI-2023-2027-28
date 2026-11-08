import fs from "fs";
import path from "path";

// 1. Fix app/api/admin/patient/assignments/route.ts
const assignmentsPath = path.resolve("app/api/admin/patient/assignments/route.ts");
let codeAssign = fs.readFileSync(assignmentsPath, "utf8").replace(/\r\n/g, "\n");
codeAssign = codeAssign.replace(
  'await PatientAssignmentService.assignEscort(serviceSupabase, { ...payload, assigned_by: assignedBy });',
  'await serviceSupabase.from("patient_escort_assignments").insert({ ...payload, assigned_by: assignedBy });'
);
fs.writeFileSync(assignmentsPath, codeAssign, "utf8");
console.log("Fixed assignments route");

// 2. Fix lib/fallback/mockDatabase.ts
const mockDbPath = path.resolve("lib/fallback/mockDatabase.ts");
let codeDb = fs.readFileSync(mockDbPath, "utf8").replace(/\r\n/g, "\n");

codeDb = codeDb.replace(
  `export const FALLBACK_CHECKLIST = [`,
  `export interface FallbackChecklistItem {
  item_type: string;
  is_completed: boolean;
  completed_at: string | null;
  notes?: string;
}

export const FALLBACK_CHECKLIST: FallbackChecklistItem[] = [`
);

codeDb = codeDb.replace(
  `private checklists: Record<number, typeof FALLBACK_CHECKLIST> = {`,
  `private checklists: Record<number, FallbackChecklistItem[]> = {`
);

fs.writeFileSync(mockDbPath, codeDb, "utf8");
console.log("Fixed mockDatabase checklist types");

// 3. Fix app/api/safety/protection-status/route.ts
const statusRoutePath = path.resolve("app/api/safety/protection-status/route.ts");
let codeStatus = fs.readFileSync(statusRoutePath, "utf8").replace(/\r\n/g, "\n");

const oldCalcBlock = /const protectionStatusResult = calculateProtectionStatus\(\{[\s\S]*?const recommendation = calculateRecommendation\(\{[\s\S]*?\}\);/;

const newCalcBlock = `const protectionStatusResult = calculateProtectionStatus({
      hasSafetyProfile: true,
      journeyStage: "treatment_in_progress",
      checklistCompletion: checklistPercentage,
      hasVerifiedCoordinator: !!coordinator,
      activeCases: {
        critical: cases.filter((c) => c.priority === "critical" && c.status !== "closed").length,
        high: cases.filter((c) => c.priority === "high" && c.status !== "closed").length,
        medium: cases.filter((c) => c.priority === "medium" && c.status !== "closed").length,
        low: cases.filter((c) => c.priority === "low" && c.status !== "closed").length,
      },
      latestCheckIn: {
        status: latestCheckIn?.status || null,
        type: (latestCheckIn as any)?.check_in_type || "scheduled",
        createdAt: latestCheckIn?.created_at || null,
      },
      riskLevel: "normal",
    });

    const recommendation = calculateRecommendation({
      protectionStatus: protectionStatusResult.status,
      checklistCompletion: checklistPercentage,
      incompleteChecklistItems: checklist.filter((i) => !i.is_completed).map((i) => i.item_type),
      hasVerifiedCoordinator: !!coordinator,
      activeCases: activeCases.length,
      latestCheckIn: {
        status: latestCheckIn?.status || null,
        createdAt: latestCheckIn?.created_at || null,
      },
      journeyStage: "treatment_in_progress",
    });`;

if (oldCalcBlock.test(codeStatus)) {
  codeStatus = codeStatus.replace(oldCalcBlock, newCalcBlock);
  fs.writeFileSync(statusRoutePath, codeStatus, "utf8");
  console.log("Fixed protection-status calculation types");
} else {
  console.warn("Pattern match failed in protection-status route");
}
