"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { User, LogOut, ShieldCheck } from "lucide-react";

export default function AccountMenu() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Get user email and role on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email || null);
      const role = user?.app_metadata?.role;
      setIsAdmin(role === 'admin' || role === 'super_admin' || role === 'safety_operator');
    });
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/admin-logout", { method: "POST" });
    } catch {}
    try {
      await fetch("/api/auth/patient-logout", { method: "POST" });
    } catch {}
    try {
      await supabase.auth.signOut();
    } catch {}
    window.location.href = isAdmin ? "/admin/login" : "/patient-login";
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-slate-700 transition"
      >
        <User size={20} className="text-slate-400" />
        <span className="text-sm text-slate-300">
          {userEmail || "Account"}
        </span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-20 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800">
              <p className="text-xs text-slate-500">Signed in as</p>
              <p className="text-sm text-white font-medium truncate">
                {userEmail || "Unknown"}
              </p>
            </div>

            <div className="py-2">
              <a
                href="/safety"
                className="flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition"
                onClick={() => setIsOpen(false)}
              >
                <ShieldCheck size={16} />
                Patient Safety Hub
              </a>
            </div>

            <div className="border-t border-slate-800 py-2">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
