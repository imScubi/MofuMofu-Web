import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  cleanSurveyAnswers,
  getSurveyTemplate,
  validateSurveyAnswers,
} from "@/lib/surveyTemplates";
import type { SurveyRow } from "@/lib/types";

export const runtime = "nodejs";

const schema = z.object({
  token: z.string().trim().min(6).max(64),
  answers: z.record(z.string(), z.string().max(1500)),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Datos inválidos." }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: surveyData } = await supabase
    .from("surveys")
    .select("*")
    .eq("public_token", parsed.data.token)
    .maybeSingle();

  const survey = surveyData as SurveyRow | null;
  if (!survey) {
    return NextResponse.json({ message: "Esta encuesta ya no existe." }, { status: 404 });
  }
  if (!survey.is_open) {
    return NextResponse.json(
      { message: "Esta encuesta ya está cerrada. ¡Gracias de todos modos!" },
      { status: 409 }
    );
  }

  // Las preguntas válidas las manda la plantilla, no quien envía: así
  // nadie puede inyectar respuestas a preguntas que no existen.
  const template = getSurveyTemplate(survey.template);
  const invalid = validateSurveyAnswers(template, parsed.data.answers);
  if (invalid) {
    return NextResponse.json({ message: invalid.message }, { status: 400 });
  }

  const { error } = await supabase.from("survey_responses").insert({
    survey_id: survey.id,
    event_id: survey.event_id,
    answers: cleanSurveyAnswers(template, parsed.data.answers),
  });

  if (error) {
    console.error("survey response error", error);
    return NextResponse.json(
      { message: "No pudimos guardar tus respuestas. Intenta de nuevo.", detail: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
