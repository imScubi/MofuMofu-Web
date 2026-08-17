import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { LogisticsPlan } from "@/components/admin/LogisticsPlan";
import { ScheduleAdmin } from "@/components/admin/ScheduleAdmin";
import { ReaccommodateAdmin } from "@/components/admin/ReaccommodateAdmin";
import { PrintButton } from "@/components/admin/PrintButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type {
  EventRow,
  EventScheduleRow,
  RegistrationRow,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPlanPage({
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

  const [{ data: registrations }, { data: schedule }] = await Promise.all([
    supabase
      .from("registrations")
      .select("*")
      .eq("event_id", selectedEvent.id)
      .order("stand_id"),
    supabase
      .from("event_schedule")
      .select("*")
      .eq("event_id", selectedEvent.id)
      .order("day")
      .order("start_time"),
  ]);

  return (
    <main className="flex-1 px-4 py-8 sm:px-8">
      {/* Todo lo que no es el plan desaparece al imprimir. */}
      <div className="mofu-no-print mx-auto mb-6 flex max-w-[900px] flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">
            Plan logístico
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Se arma solo con lo que hay en el sistema. Si alguien cancela o
            cambias un stand, vuelve a imprimirlo y ya está actualizado.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PrintButton />
          <Link href={`/admin/dashboard?event=${selectedEvent.id}`}>
            <Button variant="ghost">← Volver a expositores</Button>
          </Link>
        </div>
      </div>

      <div className="mofu-no-print mx-auto mb-8 max-w-[900px]">
        <ReaccommodateAdmin
          event={selectedEvent}
          registrations={(registrations as RegistrationRow[]) ?? []}
        />
      </div>

      <div className="mofu-no-print mx-auto mb-8 max-w-[900px]">
        <ScheduleAdmin
          event={selectedEvent}
          initialBlocks={(schedule as EventScheduleRow[]) ?? []}
        />
      </div>

      <div className="mofu-no-print mx-auto mb-3 max-w-[900px] border-t-2 border-dashed border-pink-100 pt-6">
        <h2 className="font-heading text-xl font-bold text-ink">
          Vista previa del documento
        </h2>
        <p className="mt-0.5 text-sm text-ink-soft">
          Esto es exactamente lo que sale impreso o en PDF.
        </p>
      </div>

      <LogisticsPlan
        event={selectedEvent}
        registrations={(registrations as RegistrationRow[]) ?? []}
        schedule={(schedule as EventScheduleRow[]) ?? []}
      />
    </main>
  );
}
