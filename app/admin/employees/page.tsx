import { createClient, safeSupabaseQuery } from "@/lib/supabaseServer";
import Link from "next/link";
import { Users, Plus, Mail, Phone, Shield } from "lucide-react";
import StaffPortalControls from "./StaffPortalControls";
import { ResilientDatabase } from "@/lib/fallback/mockDatabase";

export default async function EmployeesPage() {
  let employees: any[] = ResilientDatabase.getEmployees();

  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const supabase = await createClient();
      const query = supabase.from("employees").select("*").order("created_at", { ascending: false });
      const { data, error } = await safeSupabaseQuery(query, employees, 2000);

      if (!error && data && data.length > 0) {
        employees = data;
      }
    } catch {}
  }

  const adminCount = employees.filter((e) => e.role === "Admin" || e.role === "admin" || e.role === "super_admin").length;
  const execCount = employees.filter((e) => e.role !== "Admin" && e.role !== "admin" && e.role !== "super_admin").length;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex justify-between items-center mb-12">
          <div>
            <p className="uppercase tracking-[4px] text-blue-400 text-sm font-semibold">
              Team Management
            </p>
            <h1 className="text-5xl font-bold mt-3">Employees</h1>
            <p className="text-slate-400 mt-4">
              Manage operations staff, medical coordinators, and role permissions.
            </p>
          </div>

          <Link
            href="/admin/employees/add"
            className="bg-blue-600 hover:bg-blue-700 px-6 py-4 rounded-2xl font-semibold flex items-center gap-3 transition"
          >
            <Plus size={20} />
            Add Employee
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-slate-950 border border-slate-800 rounded-[32px] p-8">
            <Users size={34} className="text-blue-400" />
            <p className="text-slate-400 mt-6">Total Staff</p>
            <h2 className="text-5xl font-bold mt-3">{employees.length}</h2>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-[32px] p-8">
            <Shield size={34} className="text-green-400" />
            <p className="text-slate-400 mt-6">Administrators</p>
            <h2 className="text-5xl font-bold mt-3">{adminCount}</h2>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-[32px] p-8">
            <Users size={34} className="text-purple-400" />
            <p className="text-slate-400 mt-6">Coordinators & Specialists</p>
            <h2 className="text-5xl font-bold mt-3">{execCount}</h2>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {employees.map((employee) => (
            <div
              key={employee.id}
              className="bg-slate-950 border border-slate-800 rounded-[32px] p-8 flex flex-col justify-between"
            >
              <div>
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-2xl font-bold text-blue-400">
                  {employee.name ? employee.name.charAt(0) : "E"}
                </div>

                <h2 className="text-2xl font-bold mt-6 text-white">{employee.name}</h2>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-3 text-slate-300 text-sm">
                    <Mail size={16} className="text-slate-500" />
                    <span className="truncate">{employee.email}</span>
                  </div>

                  <div className="flex items-center gap-3 text-slate-300 text-sm">
                    <Phone size={16} className="text-slate-500" />
                    <span>{employee.phone || "N/A"}</span>
                  </div>
                </div>

                <div className="mt-6">
                  <span className="inline-block bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs px-4 py-1.5 rounded-full font-medium capitalize">
                    {employee.role || "Staff"}
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-900">
                <StaffPortalControls
                  staffId={employee.id}
                  staffEmail={employee.email}
                  currentRole={employee.role}
                  portalStatus={employee.portal_status}
                  authUserId={employee.auth_user_id}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
