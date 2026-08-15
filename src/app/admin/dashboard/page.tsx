import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import type { RegistrationRow, StandRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    redirect("/admin/login");
  }

  const supabase = createAdminClient();
  const [{ data: stands }, { data: registrations }] = await Promise.all([
    supabase.from("stands").select("*").order("id"),
    supabase.from("registrations").select("*").order("created_at", { ascending: false }),
  ]);

  return (
    <main className="flex-1 px-4 py-8 sm:px-8">
      <AdminDashboard
        initialStands={(stands as StandRow[]) ?? []}
        initialRegistrations={(registrations as RegistrationRow[]) ?? []}
      />
    </main>
  );
}
