import { createClient } from "@/lib/supabaseServer";
import Sidebar from "@/components/Sidebar";
import { getAuthenticatedAdmin } from "@/lib/auth/admin-auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAuthenticatedAdmin();
  let role: string = admin?.role ?? "unknown";

  if (!admin) {
    try {
      const supabase = await createClient();
      const timeout = new Promise<{ data: any }>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 1500)
      );
      const { data }: any = await Promise.race([
        supabase.auth.getUser(),
        timeout,
      ]);
      if (data?.user?.app_metadata?.role) {
        role = data.user.app_metadata.role;
      }
    } catch {}
  }

  return (
    <div className="bg-black min-h-screen">
      <Sidebar role={role} />
      <div className="ml-[280px]">{children}</div>
    </div>
  );
}
