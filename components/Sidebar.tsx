"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

import {
  LayoutDashboard,
  Users,
  User,
  Building2,
  Calendar,
  FileText,
  DollarSign,
  UserCog,
  Settings,
  LogOut,
  Brain,
  ShieldCheck,
  MessageSquare,
  Stethoscope,
} from "lucide-react";

type MenuItem = {
  name: string;
  href: string;
  icon: React.ElementType;
  /** Roles that can see this item. If undefined, all authenticated CRM roles can see it. */
  allowedRoles?: string[];
};

const menu: MenuItem[] = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    name: "Leads",
    href: "/admin/leads",
    icon: Users,
  },
  {
    name: "Patients",
    href: "/admin/patient",
    icon: User,
  },
  {
    name: "Hospitals",
    href: "/admin/hospitals",
    icon: Building2,
  },
  {
    name: "Followups",
    href: "/admin/followups",
    icon: Calendar,
  },
  {
    name: "Documents",
    href: "/admin/documents",
    icon: FileText,
  },
  {
    name: "Revenue",
    href: "/admin/revenue",
    icon: DollarSign,
    allowedRoles: ["admin", "super_admin", "finance"],
  },
  {
    name: "User Management",
    href: "/admin/users",
    icon: UserCog,
    allowedRoles: ["admin", "super_admin"],
  },
  {
    name: "Safety Operations",
    href: "/admin/safety",
    icon: ShieldCheck,
    allowedRoles: ["admin", "super_admin", "safety_operator"],
  },
  {
    name: "HealAI",
    href: "/admin/ai",
    icon: Brain,
  },
  {
    name: "Settings",
    href: "/admin/settings",
    icon: Settings,
    allowedRoles: ["admin", "super_admin"],
  },
];

interface SidebarProps {
  role: string;
}

export default function Sidebar({ role }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/admin-logout", { method: "POST" });
    } catch {}
    try {
      await supabase.auth.signOut();
    } catch {}
    window.location.href = "/admin/login";
  };

  const visibleMenu = menu.filter((item) => {
    if (!item.allowedRoles) return true;
    return item.allowedRoles.includes(role);
  });

  if (!mounted) {
    return (
      <div className="w-[280px] min-h-screen bg-slate-950 border-r border-slate-800 p-6 fixed left-0 top-0 flex flex-col">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">HealWithIndia</h1>
          <p className="text-slate-500 text-sm mb-2">Medical Tourism CRM</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[280px] min-h-screen bg-slate-950 border-r border-slate-800 p-6 fixed left-0 top-0 flex flex-col">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">HealWithIndia</h1>
        <p className="text-slate-500 text-sm mb-2">Medical Tourism CRM</p>
        {role && role !== "unknown" && (
          <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-medium capitalize mb-8">
            {role.replace(/_/g, " ")}
          </span>
        )}
      </div>

      <nav className="space-y-1 flex-1">
        {visibleMenu.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl text-sm transition ${
                isActive
                  ? "bg-blue-600 text-white font-medium"
                  : "text-slate-300 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <Icon size={18} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <button
        onClick={handleLogout}
        className="mt-6 w-full bg-red-500/20 text-red-400 rounded-2xl py-4 flex items-center justify-center gap-3 hover:bg-red-500/30 transition text-sm font-medium"
      >
        <LogOut size={18} />
        Logout
      </button>
    </div>
  );
}