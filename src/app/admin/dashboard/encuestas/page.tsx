import { redirect } from "next/navigation";
import Link from "next/link";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SurveysAdmin } from "@/components/admin/SurveysAdmin";
import { Card } from "@/components/ui/Card";
import type { EventRow, SurveyResponseRow, SurveyRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminEncuestasPage({
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
            Las encuestas se hacen sobre una edición del evento. Crea la primera
            para poder pedir retroalimentación.
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

  const [{ data: surveys }, { data: responses }] = await Promise.all([
    supabase
      .from("surveys")
      .select("*")
      .eq("event_id", selectedEvent.id)
      .order("created_at"),
    supabase
      .from("survey_responses")
      .select("*")
      .eq("event_id", selectedEvent.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <main className="flex-1 px-4 py-8 sm:px-8">
      <SurveysAdmin
        events={events}
        selectedEvent={selectedEvent}
        initialSurveys={(surveys as SurveyRow[]) ?? []}
        initialResponses={(responses as SurveyResponseRow[]) ?? []}
      />
    </main>
  );
}
