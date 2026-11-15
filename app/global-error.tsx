"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw, Home, ShieldAlert } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("HealWithIndia Root Layout Exception Caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-black text-white m-0 p-0 antialiased font-sans">
        <div className="min-h-screen bg-[#020817] text-white flex flex-col items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900/60 border border-slate-800 rounded-3xl p-8 text-center backdrop-blur-xl shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 mx-auto flex items-center justify-center mb-6">
              <AlertCircle size={32} />
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">System Interruption</h1>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              An unexpected system exception occurred at the root level. All safety protocols remain active.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => reset()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition cursor-pointer"
              >
                <RefreshCw size={16} />
                Reload Application
              </button>
              <a
                href="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition no-underline"
              >
                <Home size={16} />
                Return Home
              </a>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-center gap-2 text-xs text-slate-500">
              <ShieldAlert size={14} className="text-cyan-400" />
              <span>HealWithIndia Smart Tourist Protection</span>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
