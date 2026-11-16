import { createClient, safeSupabaseQuery } from "@/lib/supabaseServer";
import { FileText, Eye, ShieldCheck, Download, ExternalLink } from "lucide-react";
import Link from "next/link";
import { ResilientDatabase } from "@/lib/fallback/mockDatabase";

export default async function DocumentsPage() {
  let patients = ResilientDatabase.getPatients().filter((p) => !!p.report_url);

  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const supabase = await createClient();
      const query = supabase.from("patients").select("*").not("report_url", "is", null);
      const { data, error } = await safeSupabaseQuery(query, patients, 2000);

      if (!error && data && data.length > 0) {
        patients = data;
      }
    } catch {}
  }

  const documents = patients.map((p) => {
    const urlParts = p.report_url ? p.report_url.split("/") : [];
    const rawFilename = urlParts[urlParts.length - 1] || "medical-report.pdf";
    const cleanFilename = rawFilename.includes("?") ? rawFilename.split("?")[0] : rawFilename;
    const formattedDate = new Date(p.created_at).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    return {
      id: p.id,
      patient: p.full_name || "Unknown Patient",
      country: p.country || "—",
      treatment: p.treatment || "—",
      file: decodeURIComponent(cleanFilename),
      uploaded: formattedDate,
      size: "2.4 MB",
      url: p.report_url,
    };
  });

  return (
    <main className="min-h-screen bg-black text-white p-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 mb-12">
          <div>
            <p className="uppercase tracking-[4px] text-blue-400 text-sm font-semibold">Records</p>
            <h1 className="text-5xl font-bold mt-3">Medical Documents</h1>
            <p className="text-slate-400 mt-3">Securely review and manage uploaded international patient health files.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-slate-950 border border-slate-800 rounded-[28px] p-7">
            <FileText className="text-blue-400" size={34} />
            <p className="text-slate-400 mt-6">Total Records</p>
            <h2 className="text-5xl font-bold mt-2">{documents.length}</h2>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-[28px] p-7">
            <ShieldCheck className="text-green-400" size={34} />
            <p className="text-slate-400 mt-6">Storage Protocol</p>
            <h2 className="text-2xl font-bold mt-2 text-green-400">Encrypted Transit & RLS</h2>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-[28px] p-7">
            <Eye className="text-purple-400" size={34} />
            <p className="text-slate-400 mt-6">Access Control</p>
            <h2 className="text-2xl font-bold mt-2 text-purple-400">Role-Based (RLS)</h2>
          </div>
        </div>

        {/* Documents Table */}
        <div className="bg-slate-950 border border-slate-800 rounded-[32px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-900">
                <tr className="border-b border-slate-800">
                  <th className="px-8 py-5 text-slate-400 font-medium text-sm">Patient</th>
                  <th className="px-8 py-5 text-slate-400 font-medium text-sm">Country</th>
                  <th className="px-8 py-5 text-slate-400 font-medium text-sm">Treatment</th>
                  <th className="px-8 py-5 text-slate-400 font-medium text-sm">Document File</th>
                  <th className="px-8 py-5 text-slate-400 font-medium text-sm">Uploaded Date</th>
                  <th className="px-8 py-5 text-slate-400 font-medium text-sm text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-900/50 transition">
                    <td className="px-8 py-5 font-semibold text-white">
                      <Link href={`/admin/patient/${doc.id}`} className="hover:text-blue-400 transition">
                        {doc.patient}
                      </Link>
                    </td>
                    <td className="px-8 py-5 text-slate-300">{doc.country}</td>
                    <td className="px-8 py-5 text-slate-300">{doc.treatment}</td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-blue-400">
                        <FileText size={16} />
                        <span className="font-mono text-xs truncate max-w-[200px]">{doc.file}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-slate-400 text-sm">{doc.uploaded}</td>
                    <td className="px-8 py-5 text-right">
                      {doc.url ? (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 text-xs font-semibold transition"
                        >
                          <ExternalLink size={14} /> View File
                        </a>
                      ) : (
                        <span className="text-slate-600 text-xs">No link</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
