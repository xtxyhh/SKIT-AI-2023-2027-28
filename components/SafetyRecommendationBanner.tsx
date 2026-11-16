"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Clock,
  Sparkles,
  RefreshCw,
} from "lucide-react";

interface RecommendationData {
  type: string;
  title: string;
  description: string;
  actionText: string | null;
  actionHref: string | null;
  priority: number;
}

interface SafetyRecommendationResponse {
  success: boolean;
  status: {
    status: string;
    label: string;
    description: string;
    color: "green" | "blue" | "yellow" | "orange" | "red";
    urgency: "low" | "medium" | "high" | "critical";
  };
  recommendation: RecommendationData;
  metrics: {
    checklist_completion_percent: number;
    incomplete_items_count: number;
    active_cases_count: number;
    total_check_ins: number;
  };
}

export default function SafetyRecommendationBanner() {
  const [data, setData] = useState<SafetyRecommendationResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRecommendations = async () => {
    try {
      const res = await fetch("/api/safety/recommendations");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setData(json);
        }
      }
    } catch (err) {
      console.warn("Could not load safety recommendations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  if (loading) {
    return (
      <div className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-4 animate-pulse flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800" />
          <div className="space-y-2">
            <div className="w-48 h-4 bg-slate-800 rounded" />
            <div className="w-72 h-3 bg-slate-800/60 rounded" />
          </div>
        </div>
        <div className="w-24 h-8 bg-slate-800 rounded-lg" />
      </div>
    );
  }

  if (!data) return null;

  const { status, recommendation, metrics } = data;

  const colorStyles = {
    green: {
      bg: "bg-emerald-950/40 border-emerald-500/30",
      badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      button: "bg-emerald-600 hover:bg-emerald-500 text-white",
      icon: <CheckCircle2 className="w-6 h-6 text-emerald-400" />,
    },
    blue: {
      bg: "bg-blue-950/40 border-blue-500/30",
      badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      button: "bg-blue-600 hover:bg-blue-500 text-white",
      icon: <Sparkles className="w-6 h-6 text-blue-400" />,
    },
    yellow: {
      bg: "bg-amber-950/40 border-amber-500/30",
      badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      button: "bg-amber-600 hover:bg-amber-500 text-white",
      icon: <Clock className="w-6 h-6 text-amber-400" />,
    },
    orange: {
      bg: "bg-orange-950/40 border-orange-500/30",
      badge: "bg-orange-500/10 text-orange-400 border-orange-500/20",
      button: "bg-orange-600 hover:bg-orange-500 text-white",
      icon: <AlertTriangle className="w-6 h-6 text-orange-400" />,
    },
    red: {
      bg: "bg-rose-950/40 border-rose-500/30",
      badge: "bg-rose-500/10 text-rose-400 border-rose-500/20",
      button: "bg-rose-600 hover:bg-rose-500 text-white",
      icon: <ShieldAlert className="w-6 h-6 text-rose-400" />,
    },
  }[status.color || "blue"];

  return (
    <div
      className={`w-full rounded-2xl border p-5 transition-all shadow-xl backdrop-blur-md mb-6 ${colorStyles.bg}`}
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start space-x-4">
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/50 shadow-inner">
            {colorStyles.icon}
          </div>
          <div>
            <div className="flex items-center space-x-2.5 mb-1 flex-wrap gap-y-1">
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${colorStyles.badge}`}
              >
                {status.label}
              </span>
              <span className="text-xs text-slate-400">
                Checklist: {metrics.checklist_completion_percent}% complete
              </span>
              {metrics.active_cases_count > 0 && (
                <span className="text-xs text-rose-400 font-semibold bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                  {metrics.active_cases_count} Active Case
                </span>
              )}
            </div>
            <h3 className="text-base font-semibold text-slate-100">{recommendation.title}</h3>
            <p className="text-sm text-slate-300 mt-0.5 max-w-2xl">{recommendation.description}</p>
          </div>
        </div>

        {recommendation.actionHref && recommendation.actionText && (
          <div className="flex items-center space-x-2 shrink-0 w-full md:w-auto">
            <Link
              href={recommendation.actionHref}
              className={`w-full md:w-auto inline-flex items-center justify-center space-x-2 text-sm font-medium px-4 py-2.5 rounded-xl transition shadow-lg ${colorStyles.button}`}
            >
              <span>{recommendation.actionText}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={fetchRecommendations}
              title="Refresh recommendations"
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700 transition hidden md:block"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
