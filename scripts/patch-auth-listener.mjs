import fs from "fs";
import path from "path";

const listenerPath = path.resolve("components/AuthListener.tsx");
let code = fs.readFileSync(listenerPath, "utf8").replace(/\r\n/g, "\n");

code = code.replace(
  `          // If there is an active session (e.g. pre-existing admin session), clear it first
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            console.log("[AUTH LISTENER] Clearing active session to prevent recovery leakage");
            await supabase.auth.signOut();
          }`,
  `          // If there is an active session (e.g. pre-existing admin session), clear it first
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              console.log("[AUTH LISTENER] Clearing active session to prevent recovery leakage");
              await supabase.auth.signOut();
            }
          } catch {}`
);

fs.writeFileSync(listenerPath, code, "utf8");
console.log("Patched AuthListener.tsx");
