import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Character } from "@/components/ui/Character";
import { StarShape } from "@/components/ui/Decorations";
import { createClient } from "@/lib/supabase/client";
import { contestAvailability } from "@/lib/contestStatus";
import { getContestType } from "@/lib/contestTypes";
import { EVENT_CONFIG, eventVenue } from "@/lib/eventConfig";
import { formatDate, formatEventDates } from "@/lib/formatDates";
import type { ContestRow, EventRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Convocatorias: cosplay, dance cover y torneos",
  description: `Inscríbete en los concursos de ${EVENT_CONFIG.name}: concurso de cosplay, dance cover y torneos de cartas coleccionables.`,
  alternates: { canonical: "/convocatorias" },
};

export default async function ConvocatoriasPage() {
  const supabase = createClient();

  const { data: eventsData } = await supabase
    .from("events")
    .select("*")
    .eq("is_open", true)
    .order("date_start");
  const events = (eventsData as EventRow[]) ?? [];

  const { data: contestsData } = events.length
    ? await supabase
        .from("contests")
        .select("*")
        .in(
          "event_id",
          events.map((e) => e.id)
        )
        .order("created_at")
    : { data: [] };
  const contests = (contestsData as ContestRow[]) ?? [];

  const byEvent = events
    .map((event) => ({
      event,
      contests: contests.filter((c) => c.event_id === event.id),
    }))
    .filter((group) => group.contests.length > 0);

  return (
    <main className="flex-1 px-4 py-10 sm:py-14">
      <div className="mx-auto mb-8 max-w-3xl text-center">
        <div className="flex items-end justify-center gap-2">
          <Character name="raton" size={96} />
          <Character name="gato" size={124} priority />
          <Character name="camaleon" size={100} />
        </div>
        <StarShape className="mx-auto mt-1 h-9 w-9" />
        <h1 className="mt-2 font-heading text-3xl font-bold text-ink">Convocatorias</h1>
        <p className="mt-2 text-ink-soft">
          Concursos y torneos de {EVENT_CONFIG.name}. Elige en cuál quieres participar.
        </p>
      </div>

      {byEvent.length === 0 ? (
        <Card className="mx-auto max-w-lg p-8 text-center">
          <Character name="conejita" size={116} className="mx-auto" />
          <h2 className="mt-1 font-heading text-xl font-bold text-ink">
            Todavía no hay convocatorias abiertas
          </h2>
          <p className="mt-2 text-ink-soft">
            Estamos preparando los concursos de la próxima edición. Síguenos o
            escríbenos a{" "}
            <a
              className="font-semibold text-pink-600 underline"
              href={`mailto:${EVENT_CONFIG.contactEmail}`}
            >
              {EVENT_CONFIG.contactEmail}
            </a>{" "}
            para avisarte en cuanto abran.
          </p>
          <Link href="/" className="mt-5 block">
            <Button variant="ghost" className="w-full">
              Volver al inicio
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="mx-auto max-w-3xl space-y-8">
          {byEvent.map(({ event, contests: eventContests }) => (
            <section key={event.id}>
              <h2 className="font-heading text-xl font-bold text-ink">{event.name}</h2>
              <p className="text-sm text-ink-soft">
                {formatEventDates(event.date_start, event.date_end)}
                {eventVenue(event).line ? ` · ${eventVenue(event).line}` : ""}
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {eventContests.map((contest) => {
                  const type = getContestType(contest.type);
                  const availability = contestAvailability(contest);

                  return (
                    <Card key={contest.id} className="flex flex-col p-5">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-pink-700">
                        {type.label}
                      </p>
                      <h3 className="mt-1 font-heading text-lg font-bold leading-tight text-ink">
                        {contest.name}
                      </h3>
                      {contest.description && (
                        <p className="mt-1.5 text-[13.5px] leading-[1.55] text-ink-soft">
                          {contest.description}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {availability.spotsLeft != null && (
                          <span
                            className={`rounded-full px-2.5 py-1 text-[12px] font-bold ${
                              availability.spotsLeft > 0
                                ? "bg-mint-100 text-mint-500"
                                : "bg-danger-50 text-danger-600"
                            }`}
                          >
                            {availability.spotsLeft > 0
                              ? `${availability.spotsLeft} de ${contest.max_entries} lugares`
                              : "Cupo lleno"}
                          </span>
                        )}
                        {contest.registration_deadline && (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[12px] font-bold text-amber-500">
                            Cierra el {formatDate(contest.registration_deadline)}
                          </span>
                        )}
                      </div>

                      <div className="mt-4 flex-1" />

                      {availability.open ? (
                        <Link href={`/convocatorias/${contest.id}`}>
                          <Button className="w-full">Inscribirme</Button>
                        </Link>
                      ) : (
                        <p className="rounded-2xl bg-gray-100 px-3 py-2.5 text-center text-[13px] font-bold text-ink-soft">
                          {availability.closedReason}
                        </p>
                      )}

                      {/* El reglamento se puede leer antes de decidir, sin
                          entrar al formulario. */}
                      <Link
                        href={`/convocatorias/${contest.id}/reglamento`}
                        className="mt-2 block text-center text-[13px] font-bold text-pink-700 underline underline-offset-2"
                      >
                        Ver reglamento y premios
                      </Link>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}

          <Link href="/" className="block">
            <Button variant="ghost" className="w-full">
              Volver al inicio
            </Button>
          </Link>
        </div>
      )}
    </main>
  );
}
