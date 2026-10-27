"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, Lock, Mail, ArrowRight, Sparkles, CheckCircle2, AlertTriangle } from "lucide-react";

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [backendStatus, setBackendStatus] = useState<{
    supabase_connected: boolean;
    mode: string;
  } | null>(null);

  // Check backend and middleware errors
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "unauthorized") {
      setError("You do not have permission to access the Admin Portal. This login is for HealWithIndia administrators only.");
    } else if (errorParam === "forbidden") {
      setError("Access Denied: Your account does not have permission to access this section of the Admin Portal.");
    }

    // Check backend status
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.backend_status) {
          setBackendStatus(data.backend_status);
        }
      })
      .catch(() => {});
  }, [searchParams]);

  const handleLogin = async (customEmail?: string, customPassword?: string) => {
    setError("");
    const targetEmail = customEmail || email;
    const targetPassword = customPassword || password;

    if (!targetEmail || !targetPassword) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, password: targetPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Authentication failed. Please check your credentials.");
        setLoading(false);
        return;
      }

      // Successful login
      router.replace("/admin");
    } catch {
      setError("Network error occurred while authenticating. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = () => {
    setEmail("admin@healwithindia.com");
    setPassword("admin123");
    handleLogin("admin@healwithindia.com", "admin123");
  };

  return (
    <main className="min-h-screen bg-[#020817] relative overflow-hidden flex items-center justify-center px-5 py-12">
      {/* Background Glows */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-500/10 blur-[150px] rounded-full" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 blur-[150px] rounded-full" />

      <div className="relative w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck size={36} />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            HealWithIndia
          </h1>
          <p className="text-emerald-400 font-semibold tracking-wider text-xs uppercase mt-1">
            Enterprise Admin & Operations Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-[32px] border border-slate-800 bg-slate-900/60 backdrop-blur-3xl p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-2.5">
              <Lock size={20} className="text-blue-400" />
              <h2 className="text-lg font-bold text-white">Administrator Access</h2>
            </div>

            {/* Backend Diagnostics Badge */}
            {backendStatus && (
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border flex items-center gap-1 ${
                  backendStatus.supabase_connected
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                }`}
                title={
                  backendStatus.supabase_connected
                    ? "Live Supabase Cloud Connected"
                    : "Local Resilient Mode Active"
                }
              >
                {backendStatus.supabase_connected ? (
                  <>
                    <CheckCircle2 size={11} /> Cloud Live
                  </>
                ) : (
                  <>
                    <Sparkles size={11} /> Resilient Mode
                  </>
                )}
              </span>
            )}
          </div>

          {error && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300 px-4 py-3 text-xs leading-relaxed flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                Admin Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  placeholder="admin@healwithindia.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-xs font-semibold mb-1.5 uppercase tracking-wider">
                Security Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            <button
              onClick={() => handleLogin()}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold py-3.5 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-600/20 active:scale-[0.98]"
            >
              {loading ? "Authenticating..." : "Sign In to Operations Portal"}
              <ArrowRight size={16} />
            </button>

            {/* Quick Demo Admin Login Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleQuickDemoLogin}
                disabled={loading}
                className="w-full bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-blue-300 hover:text-white font-medium py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-2"
              >
                <Sparkles size={14} className="text-amber-400" />
                1-Click Demo Admin Login (admin@healwithindia.com)
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 text-center">
            <p className="text-slate-500 text-xs">
              Patient access portal is available at{" "}
              <a href="/patient-login" className="text-blue-400 hover:text-blue-300 font-medium">
                /patient-login
              </a>
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-slate-600 text-xs">
            Restricted to authorized HealWithIndia operations personnel and administrators.
          </p>
        </div>
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#020817] flex items-center justify-center text-white">
          Loading Admin Portal...
        </div>
      }
    >
      <AdminLoginContent />
    </Suspense>
  );
}
