"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Loader2,
  ArrowRight,
  UserRound,
  Sparkles,
} from "lucide-react";

function PatientLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Show error from middleware redirect
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "no_access") {
      setError(
        "Patient portal access has not been enabled for this account. Please contact your HealWithIndia coordinator."
      );
    }
    if (errorParam === "auth_callback_failed") {
      setError(
        "Authentication callback failed. Please retry from your invitation email or contact support."
      );
    }
  }, [searchParams]);

  const handleLogin = async (customEmail?: string, customPassword?: string) => {
    setError("");

    const targetEmail = customEmail || email;
    const targetPassword = customPassword || password;

    if (!targetEmail || !targetPassword) {
      setError("Please enter email and password.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/auth/patient-login", {
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

      router.replace("/safety");
    } catch {
      setError("Network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoPatientLogin = () => {
    setEmail("patient@healwithindia.com");
    setPassword("patient123");
    handleLogin("patient@healwithindia.com", "patient123");
  };

  return (
    <main className="min-h-screen bg-[#020817] relative overflow-hidden flex items-center justify-center px-5 py-12">
      {/* Aurora */}
      <div className="absolute inset-0">
        <div className="absolute top-[-250px] left-[-200px] w-[700px] h-[700px] bg-green-600/20 rounded-full blur-[180px]" />
        <div className="absolute bottom-[-250px] right-[-150px] w-[650px] h-[650px] bg-cyan-500/15 rounded-full blur-[180px]" />
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)] bg-[size:70px_70px]" />
      </div>

      <div className="relative z-10 w-full max-w-[520px]">
        {/* Quick Demo Login Option */}
        <div className="mb-4 bg-emerald-950/60 border border-emerald-500/30 rounded-3xl p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <Sparkles size={16} />
              <span>Evaluation Mode: Instant Patient Login</span>
            </div>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded-full">
              Demo Patient
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-1.5 mb-3">
            Access Safety Hub as active international patient (Tariq Al-Mansoor).
          </p>
          <button
            type="button"
            onClick={handleQuickDemoPatientLogin}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center justify-center gap-2"
          >
            <Sparkles size={14} />
            ✨ 1-Click Demo Patient Login
          </button>
        </div>

        <div className="rounded-[42px] border border-slate-800 bg-slate-900/50 backdrop-blur-3xl shadow-[0_30px_100px_rgba(0,0,0,.45)] overflow-hidden">
          {/* Header */}
          <div className="px-10 pt-10 text-center">
            <div className="h-20 w-20 mx-auto rounded-[28px] bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <UserRound size={40} className="text-green-400" />
            </div>

            <p className="uppercase tracking-[5px] text-green-400 text-xs mt-6 font-semibold">
              Patient Portal
            </p>

            <h1 className="text-4xl font-bold text-white mt-2">
              Safety Hub
            </h1>

            <p className="text-slate-400 mt-3 text-sm">
              Secure access to your tourist protection & medical journey
            </p>
          </div>

          {/* Form */}
          <div className="px-10 pb-10 pt-8">
            <div className="space-y-5">
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-5 top-4 text-slate-500"
                />

                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleLogin();
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-[20px] py-4 pl-12 pr-5 text-sm text-white outline-none focus:border-green-500 transition-all"
                />
              </div>

              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-5 top-4 text-slate-500"
                />

                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleLogin();
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-[20px] py-4 pl-12 pr-14 text-sm text-white outline-none focus:border-green-500 transition-all"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-4 text-slate-500"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {error && (
                <div className="rounded-[16px] border border-red-500/20 bg-red-500/10 text-red-400 px-4 py-3 text-xs">
                  {error}
                </div>
              )}

              <button
                onClick={() => handleLogin()}
                disabled={loading}
                className="w-full group rounded-[20px] bg-gradient-to-r from-green-600 to-emerald-500 py-4 font-semibold text-base hover:scale-[1.01] disabled:opacity-50 transition-all duration-300 shadow-[0_0_40px_rgba(34,197,94,.3)]"
              >
                {loading ? (
                  <div className="flex justify-center">
                    <Loader2 size={20} className="animate-spin" />
                  </div>
                ) : (
                  <div className="flex justify-center items-center gap-2">
                    Access Safety Hub
                    <ArrowRight
                      size={18}
                      className="group-hover:translate-x-1 transition"
                    />
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-slate-500 mt-6 text-xs">
          HealWithIndia Dual-Mode Patient Authentication
        </p>
      </div>
    </main>
  );
}

export default function PatientLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020817] flex items-center justify-center text-white">Loading...</div>}>
      <PatientLoginContent />
    </Suspense>
  );
}
