import fs from "fs";
import path from "path";

const pagePath = path.resolve("app/admin/page.tsx");
let code = fs.readFileSync(pagePath, "utf8").replace(/\r\n/g, "\n");

code = code.replace(
  'import { FALLBACK_PATIENTS } from "@/lib/fallback/mockDatabase";',
  'import { FALLBACK_PATIENTS, ResilientDatabase } from "@/lib/fallback/mockDatabase";'
);

const targetPattern = /export default async function AdminPage\(\) \{[\s\S]*?const allPatients: Patient\[\] = patients \?\? FALLBACK_PATIENTS;/;

const replacement = `export default async function AdminPage() {
  const adminUser = await getAuthenticatedAdmin();
  let user = null;

  if (!adminUser) {
    try {
      const supabase = await createClient();
      const timeout = new Promise<{ data: any }>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 1500)
      );
      const { data }: any = await Promise.race([
        supabase.auth.getUser(),
        timeout,
      ]);
      user = data?.user || null;
    } catch {
      // Supabase offline / paused
    }
  }

  if (!adminUser && !user) {
    redirect("/admin/login");
  }

  let patients: Patient[] = ResilientDatabase.getPatients() as any;

  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const supabase = await createClient();
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 2000)
      );
      const { data, error }: any = await Promise.race([
        supabase.from("patients").select("*").order("created_at", { ascending: false }),
        timeout,
      ]);

      if (!error && data && data.length > 0) {
        patients = data;
      }
    } catch {
      // Keep resilient fallback
    }
  }

  const allPatients: Patient[] = patients;`;

if (targetPattern.test(code)) {
  code = code.replace(targetPattern, replacement);
  fs.writeFileSync(pagePath, code, "utf8");
  console.log("Successfully patched app/admin/page.tsx");
} else {
  console.warn("Pattern match failed for app/admin/page.tsx");
}
