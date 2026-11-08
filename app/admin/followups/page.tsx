import { createClient } from "@/lib/supabaseServer";
import Link from "next/link";
import { ResilientDatabase } from "@/lib/fallback/mockDatabase";

export default async function FollowupsPage() {
  let patients = ResilientDatabase.getPatients();

  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const supabase = await createClient();
      const timeout = new Promise<{ data: any; error: any }>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 2000)
      );
      const { data, error }: any = await Promise.race([
        supabase.from("patients").select("*").order("created_at", { ascending: false }),
        timeout,
      ]);

      if (!error && data && data.length > 0) {
        patients = data;
      }
    } catch {}
  }

  // Derive followups: patients who are in "Converted", "Completed", "Treatment Started", "Hospital Assigned"
  const activePatients = patients.filter((p) =>
    ["Converted", "Completed", "Treatment Started", "Hospital Assigned"].includes(p.status || "")
  );

  const followups = activePatients.map((p) => {
    const createdAt = new Date(p.created_at);
    // Followup date is 30 days after creation
    const followupDate = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);
    const isOverdue = followupDate.getTime() < new Date().getTime();

    return {
      id: p.id,
      patient: p.full_name || "Unknown Patient",
      country: p.country || "—",
      treatment: p.treatment || "—",
      nextFollowup: followupDate.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      status: p.status === "Completed" ? "Completed" : isOverdue ? "Overdue" : "Scheduled",
    };
  });

  return (
    <main className="min-h-screen bg-black text-white p-10">
      <div className="max-w-7xl mx-auto">
        <p className="uppercase tracking-[4px] text-blue-400 text-sm font-semibold">Operations</p>
        <h1 className="text-5xl font-bold mt-3 mb-2">Follow Ups</h1>
        <p className="text-slate-400 mb-10">Manage and track dynamic patient follow-up schedules automatically.</p>

        <div className="bg-slate-950 border border-slate-800 rounded-[32px] overflow-hidden">
          {followups.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-500 text-lg">No active follow-ups scheduled at this time.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-900">
                  <tr className="border-b border-slate-800">
                    <th className="px-6 py-5 text-slate-400 font-medium text-sm">Patient</th>
                    <th className="px-6 py-5 text-slate-400 font-medium text-sm">Country</th>
                    <th className="px-6 py-5 text-slate-400 font-medium text-sm">Treatment</th>
                    <th className="px-6 py-5 text-slate-400 font-medium text-sm">Next Follow Up</th>
                    <th className="px-6 py-5 text-slate-400 font-medium text-sm">Status</th>
                    <th className="px-6 py-5 text-slate-400 font-medium text-sm text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {followups.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-900/50 transition">
                      <td className="px-6 py-5 font-semibold text-white">
                        <Link href={`/admin/patient/${f.id}`} className="hover:text-blue-400 transition">
                          {f.patient}
                        </Link>
                      </td>
                      <td className="px-6 py-5 text-slate-300">{f.country}</td>
                      <td className="px-6 py-5 text-slate-300">{f.treatment}</td>
                      <td className="px-6 py-5 text-slate-400 text-sm">{f.nextFollowup}</td>
                      <td className="px-6 py-5">
                        <span
                          className={`text-xs px-3 py-1 rounded-full font-semibold ${
                            f.status === "Completed"
                              ? "bg-green-500/20 text-green-400 border border-green-500/30"
                              : f.status === "Overdue"
                              ? "bg-red-500/20 text-red-400 border border-red-500/30"
                              : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          }`}
                        >
                          {f.status}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <Link
                          href={`/admin/patient/${f.id}`}
                          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg transition"
                        >
                          Review Patient
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
