import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SpacesAdmin } from "@/components/admin/SpacesAdmin";
import { Card } from "@/components/ui/Card";
import type { EventRow, EventStandRow, EventZoneRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminEspaciosPage({
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
            Los planes y las zonas se definen dentro de una edición. Crea la
            primera para poder repartir los lugares.
          </p>
          <Link
            href="/admin/dashboard/eventos"
            className="mt-4 inline-block font-bold text-pink-700 underline underline-offset-2"
          >
            Crear una edición
          </Link>
        </Card>
      </main>
    );
  }

  const { event: requestedEventId } = await searchParams;
  const selectedEvent =
    events.find((e) => e.id === requestedEventId) ??
    events.find((e) => e.is_open) ??
    events[0];

  const [{ data: zones }, { data: stands }] = await Promise.all([
    supabase
      .from("event_zones")
      .select("*")
      .eq("event_id", selectedEvent.id)
      .order("created_at"),
    supabase
      .from("event_stands")
      .select("*")
      .eq("event_id", selectedEvent.id)
      .order("stand_id"),
  ]);

  return (
    <main className="flex-1 px-4 py-8 sm:px-8">
      <SpacesAdmin
        events={events}
        selectedEvent={selectedEvent}
        initialZones={(zones as EventZoneRow[]) ?? []}
        stands={(stands as EventStandRow[]) ?? []}
      />
    </main>
  );
}
