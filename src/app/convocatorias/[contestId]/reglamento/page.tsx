import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContestRegulation } from "@/components/ContestRegulation";
import { PrintButton } from "@/components/admin/PrintButton";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { getRegulationTemplate } from "@/lib/contestRegulation";
import type { ContestRow, EventRow } from "@/lib/types";

export const dynamic = "force-dynamic";

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
  if (!contest) return { title: "Reglamento no encontrado" };

  return {
    title: `Reglamento — ${contest.name}`,
    description: `Reglamento oficial de ${contest.name}: cupos, costo de entrada, formato y premiación.`,
    alternates: { canonical: `/convocatorias/${contest.id}/reglamento` },
  };
}

/**
 * El reglamento en su propia página, para compartirlo por WhatsApp o
 * imprimirlo. Es el mismo documento que sale dentro del formulario: no
 * hay dos versiones que puedan decir cosas distintas.
 */
export default async function ReglamentoPage({
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

  return (
    <main className="flex-1 px-4 py-8 sm:py-12">
      <div className="mofu-no-print mx-auto mb-5 flex max-w-[820px] flex-wrap items-center justify-between gap-3">
        <Link href={`/convocatorias/${contest.id}`}>
          <Button variant="ghost">← Volver a la inscripción</Button>
        </Link>
        <PrintButton />
      </div>

      <div className="mx-auto max-w-[820px] rounded-[26px] border border-pink-100 bg-white p-6 sm:p-10">
        <ContestRegulation contest={contest} event={event} />
      </div>

      <p className="mofu-no-print mx-auto mt-4 max-w-[820px] text-center text-[13px] text-ink-soft">
        {getRegulationTemplate(contest.type).title} · Este reglamento se
        actualiza solo cuando cambian los premios o las fechas.
      </p>
    </main>
  );
}
