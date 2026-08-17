import { RegistrationForm } from "@/components/RegistrationForm";
import { Card } from "@/components/ui/Card";
import { Character } from "@/components/ui/Character";
import { FlowerShape } from "@/components/ui/Decorations";
import { createClient } from "@/lib/supabase/client";
import { EVENT_CONFIG } from "@/lib/eventConfig";
import type { EventRow, EventStandRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RegistroPage() {
  const supabase = createClient();

  const { data: eventsData } = await supabase
    .from("events")
    .select("*")
    .eq("is_open", true)
    .order("date_start");

  const events = (eventsData as EventRow[]) ?? [];

  if (events.length === 0) {
    return (
      <main className="flex-1 px-4 py-16">
        <Card className="mx-auto max-w-lg p-8 text-center">
          <Character name="camaleon" size={116} className="mx-auto" />
          <FlowerShape className="mx-auto mt-1 h-10 w-10" />
          <h1 className="font-heading mt-3 text-2xl font-bold text-ink">
            Aún no hay ediciones abiertas
          </h1>
          <p className="mt-2 text-ink-soft">
            Por ahora no tenemos registros abiertos. Escríbenos a{" "}
            <a
              className="font-semibold text-pink-600 underline"
              href={`mailto:${EVENT_CONFIG.contactEmail}`}
            >
              {EVENT_CONFIG.contactEmail}
            </a>{" "}
            para avisarte de la próxima fecha.
          </p>
        </Card>
      </main>
    );
  }

  const { data: standsData } = await supabase
    .from("event_stands")
    .select("*")
    .in(
      "event_id",
      events.map((e) => e.id)
    )
    .order("stand_id");

  const standsByEvent: Record<string, EventStandRow[]> = {};
  for (const event of events) standsByEvent[event.id] = [];
  for (const row of (standsData as EventStandRow[]) ?? []) {
    standsByEvent[row.event_id]?.push(row);
  }

  return (
    <main className="flex-1 px-4 py-10 sm:py-14">
      <div className="mx-auto mb-8 max-w-3xl text-center">
        <Character name="raton" size={124} className="mx-auto" priority />
        <h1 className="mt-1 font-heading text-3xl font-bold text-ink">
          Registro de expositores
        </h1>
        <p className="mt-2 text-ink-soft">Sigue estos pasos para apartar tu lugar</p>
      </div>
      <RegistrationForm events={events} standsByEvent={standsByEvent} />
    </main>
  );
}
