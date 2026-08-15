import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { EventsAdmin } from "@/components/admin/EventsAdmin";
import type { EventRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminEventosPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const supabase = createAdminClient();
  const { data } = await supabase.from("events").select("*").order("date_start");

  return (
    <main className="flex-1 px-4 py-8 sm:px-8">
      <EventsAdmin initialEvents={(data as EventRow[]) ?? []} />
    </main>
  );
}
