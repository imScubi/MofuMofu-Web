import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  cleanAnswers,
  getContestType,
  validateAnswers,
} from "@/lib/contestTypes";
import type { ContestRow } from "@/lib/types";

export const runtime = "nodejs";

const schema = z.object({
  contestId: z.string().uuid(),
  participantName: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(6).max(30),
  email: z.string().trim().email().optional().or(z.literal("")),
  answers: z.record(z.string(), z.string().max(1000)),
});

// Los motivos de rechazo que levanta register_contest_entry(), en
// español. Que la base sea la que decide evita que dos personas ganen el
// último lugar por mandar el formulario al mismo tiempo.
const RPC_ERRORS: Record<string, { message: string; status: number }> = {
  CONTEST_NOT_FOUND: { message: "Esa convocatoria ya no existe.", status: 404 },
  CONTEST_CLOSED: { message: "Las inscripciones de esta convocatoria están cerradas.", status: 409 },
  CONTEST_DEADLINE_PASSED: { message: "Ya pasó la fecha límite de inscripción.", status: 409 },
  CONTEST_FULL: { message: "Se acaban de agotar los lugares de esta convocatoria.", status: 409 },
};

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Revisa los datos del formulario.", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const payload = parsed.data;
  const supabase = createAdminClient();

  const { data: contestData } = await supabase
    .from("contests")
    .select("*")
    .eq("id", payload.contestId)
    .maybeSingle();

  const contest = contestData as ContestRow | null;
  if (!contest) {
    return NextResponse.json({ message: "Esa convocatoria ya no existe." }, { status: 404 });
  }

  // El tipo manda qué preguntas son válidas: así nadie puede inyectar
  // campos que el admin nunca configuró.
  const type = getContestType(contest.type);
  const invalid = validateAnswers(type, payload.answers);
  if (invalid) {
    return NextResponse.json({ message: invalid.message }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("register_contest_entry", {
    p_contest_id: contest.id,
    p_participant_name: payload.participantName,
    p_phone: payload.phone,
    p_email: payload.email || null,
    p_answers: cleanAnswers(type, payload.answers),
  });

  if (error) {
    for (const [code, response] of Object.entries(RPC_ERRORS)) {
      if (error.message.includes(code)) {
        return NextResponse.json(
          { code, message: response.message },
          { status: response.status }
        );
      }
    }
    console.error("register_contest_entry error", error);
    return NextResponse.json(
      {
        message: "No pudimos completar tu inscripción. Intenta de nuevo.",
        detail: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
