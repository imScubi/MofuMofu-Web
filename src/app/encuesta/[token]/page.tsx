import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SurveyForm } from "@/components/SurveyForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Character } from "@/components/ui/Character";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EventRow, SurveyRow } from "@/lib/types";

export const dynamic = "force-dynamic";

// La encuesta se manda por link a quien participó; no tiene por qué
// aparecer en Google ni recibir respuestas de gente que pasaba por ahí.
export const metadata: Metadata = {
  title: "Encuesta de retroalimentación",
  robots: { index: false, follow: false },
};

// La encuesta se busca con la service role key desde el servidor: así la
// tabla no necesita ser legible con la anon key y nadie puede listar los
// tokens de las demás encuestas.

export default async function EncuestaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createAdminClient();

  const { data: surveyData } = await supabase
    .from("surveys")
    .select("*")
    .eq("public_token", token)
    .maybeSingle();

  const survey = surveyData as SurveyRow | null;
  if (!survey) notFound();

  const { data: eventData } = await supabase
    .from("events")
    .select("*")
    .eq("id", survey.event_id)
    .maybeSingle();

  const event = eventData as EventRow | null;
  if (!event) notFound();

  if (!survey.is_open) {
    return (
      <main className="flex-1 px-4 py-16">
        <Card className="mx-auto max-w-lg p-8 text-center">
          <Character name="camaleon" size={120} className="mx-auto" />
          <h1 className="mt-2 font-heading text-2xl font-bold text-ink">
            Esta encuesta ya cerró
          </h1>
          <p className="mt-2 text-ink-soft">
            Ya no estamos recibiendo respuestas de {event.name}. ¡Gracias por
            querer participar!
          </p>
          <Link href="/" className="mt-5 block">
            <Button variant="secondary" className="w-full">
              Ir al inicio
            </Button>
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 py-10 sm:py-14">
      <SurveyForm survey={survey} event={event} />
    </main>
  );
}
