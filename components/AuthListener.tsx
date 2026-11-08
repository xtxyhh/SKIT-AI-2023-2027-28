"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthListener() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 1. Listen to Supabase Auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        console.log("[AUTH LISTENER] PASSWORD_RECOVERY event detected, redirecting to /reset-password");
        router.replace("/reset-password");
      }
    });

    // 2. Immediate check of URL hash on mount or pathname changes
    const handleHashCheck = async () => {
      if (typeof window !== "undefined" && window.location.hash) {
        const hash = window.location.hash;
        if (hash.includes("type=recovery") || hash.includes("type=invite")) {
          // If there is an active session (e.g. pre-existing admin session), clear it first
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              console.log("[AUTH LISTENER] Clearing active session to prevent recovery leakage");
              await supabase.auth.signOut();
            }
          } catch {}

          if (pathname !== "/reset-password") {
            console.log(
              `[AUTH LISTENER] Recovery/Invite hash detected on path "${pathname}", redirecting to /reset-password`
            );
            router.replace(`/reset-password${hash}`);
          }
        }
      }
    };

    handleHashCheck();

    return () => {
      subscription.unsubscribe();
    };
  }, [router, pathname]);

  return null;
}
