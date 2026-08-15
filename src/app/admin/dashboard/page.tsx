import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { Card } from "@/components/ui/Card";
import type { EventRow, EventStandRow, RegistrationRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>;
}) {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }

  const supabase = createAdminClient();
  const { data: eventsData } = await supabase
    .from("events")
    .select("*")
    .order("date_start");
  const events = (eventsData as EventRow[]) ?? [];

  if (events.length === 0) {
    return (
      <main className="flex-1 px-4 py-16">
        <Card className="mx-auto max-w-lg p-8 text-center">
          <h1 className="font-heading text-2xl font-bold text-ink">
            Aún no hay ediciones
          </h1>
          <p className="mt-2 text-ink-soft">
            Crea la primera edición del evento para empezar a recibir registros.
          </p>
          <a
            href="/admin/dashboard/eventos"
            className="mt-4 inline-block font-bold text-pink-700 underline underline-offset-2"
          >
            Crear una edición
          </a>
        </Card>
      </main>
    );
  }

  const { event: requestedEventId } = await searchParams;
  const selectedEvent =
    events.find((e) => e.id === requestedEventId) ??
    events.find((e) => e.is_open) ??
    events[0];

  const [{ data: stands }, { data: registrations }] = await Promise.all([
    supabase.from("event_stands").select("*").eq("event_id", selectedEvent.id),
    supabase
      .from("registrations")
      .select("*")
      .eq("event_id", selectedEvent.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <main className="flex-1 px-4 py-8 sm:px-8">
      <AdminDashboard
        events={events}
        selectedEvent={selectedEvent}
        initialStands={(stands as EventStandRow[]) ?? []}
        initialRegistrations={(registrations as RegistrationRow[]) ?? []}
      />
    </main>
  );
}
