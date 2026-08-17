import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContestForm } from "@/components/ContestForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import { EVENT_CONFIG } from "@/lib/eventConfig";
import type { ContestRow, EventRow } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Cada convocatoria tiene su propio título y descripción, para que
 * "concurso de cosplay MofuMofu" caiga en la página del concurso y no en
 * la portada.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ contestId: string }>;
}): Promise<Metadata> {
  const { contestId } = await params;
  const supabase = createClient();
  const { data } = await supabase
    .from("contests")
    .select("*")
    .eq("id", contestId)
    .maybeSingle();

  const contest = data as ContestRow | null;
  if (!contest) return { title: "Convocatoria no encontrada" };

  return {
    title: contest.name,
    description:
      contest.description ||
      `Inscríbete en ${contest.name} de ${EVENT_CONFIG.name}. Cupo limitado.`,
    alternates: { canonical: `/convocatorias/${contest.id}` },
  };
}

export default async function ConvocatoriaPage({
  params,
}: {
  params: Promise<{ contestId: string }>;
}) {
  const { contestId } = await params;
  const supabase = createClient();

  const { data: contestData } = await supabase
    .from("contests")
    .select("*")
    .eq("id", contestId)
    .maybeSingle();

  const contest = contestData as ContestRow | null;
  if (!contest) notFound();

  const { data: eventData } = await supabase
    .from("events")
    .select("*")
    .eq("id", contest.event_id)
    .maybeSingle();

  const event = eventData as EventRow | null;
  if (!event) notFound();

  // Si la edición completa se cerró, la convocatoria ya no aplica
  // aunque ella misma siga marcada como abierta.
  if (!event.is_open) {
    return (
      <main className="flex-1 px-4 py-16">
        <Card className="mx-auto max-w-lg p-8 text-center">
          <h1 className="font-heading text-2xl font-bold text-ink">
            Esta edición ya cerró
          </h1>
          <p className="mt-2 text-ink-soft">
            Las inscripciones de {event.name} ya no están disponibles.
          </p>
          <Link href="/convocatorias" className="mt-5 block">
            <Button variant="secondary" className="w-full">
              Ver otras convocatorias
            </Button>
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 py-10 sm:py-14">
      <ContestForm contest={contest} event={event} />
    </main>
  );
}
