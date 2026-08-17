import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SURVEY_TEMPLATES } from "@/lib/surveyTemplates";

export const runtime = "nodejs";

const templateIds = SURVEY_TEMPLATES.map((t) => t.id) as [string, ...string[]];

const createSchema = z.object({
  eventId: z.string().uuid(),
  template: z.enum(templateIds),
  title: z.string().trim().min(1).max(160),
  intro: z.string().trim().max(1200).optional().or(z.literal("")),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(160).optional(),
  intro: z.string().trim().max(1200).optional().or(z.literal("")),
  isOpen: z.boolean().optional(),
});

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Revisa los datos de la encuesta.", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { eventId, template, title, intro } = parsed.data;
  const supabase = createAdminClient();

  // El token público lo genera la base de datos (default de la columna).
  const { data, error } = await supabase
    .from("surveys")
    .insert({ event_id: eventId, template, title, intro: intro || null })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { message: "No pudimos crear la encuesta.", detail: error?.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Datos inválidos." }, { status: 400 });
  }

  const { id, ...fields } = parsed.data;
  const update: Record<string, unknown> = {};
  if (fields.title !== undefined) update.title = fields.title;
  if (fields.intro !== undefined) update.intro = fields.intro || null;
  if (fields.isOpen !== undefined) update.is_open = fields.isOpen;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ message: "Nada que actualizar." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("surveys")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { message: "No pudimos actualizar la encuesta.", detail: error?.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ message: "Falta el id." }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Borrar la encuesta se lleva sus respuestas por delante (cascade), y
  // la retroalimentación no se puede volver a pedir: sólo se permite
  // cuando todavía no contesta nadie. Para dejar de recibir respuestas
  // está el botón de cerrar.
  const { count } = await supabase
    .from("survey_responses")
    .select("id", { count: "exact", head: true })
    .eq("survey_id", id);

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      {
        message: `Esta encuesta ya tiene ${count} respuestas. Ciérrala en vez de borrarla para no perderlas.`,
      },
      { status: 409 }
    );
  }

  const { error } = await supabase.from("surveys").delete().eq("id", id);
  if (error) {
    return NextResponse.json(
      { message: "No pudimos borrar la encuesta.", detail: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
