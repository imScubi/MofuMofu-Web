import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { CONTEST_TYPES } from "@/lib/contestTypes";
import { getRegulationTemplate } from "@/lib/contestRegulation";

export const runtime = "nodejs";

const contestTypeIds = CONTEST_TYPES.map((t) => t.id) as [string, ...string[]];
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");

const prizePlaceSchema = z.object({
  cash: z.number().min(0).max(1000000),
  percent: z.number().min(0).max(100),
  other: z.string().trim().max(160),
});

const prizeCategorySchema = z.object({
  label: z.string().trim().min(1).max(80),
  entryFee: z.number().min(0).max(100000),
  slots: z.number().int().positive().max(10000).nullable(),
  places: z.array(prizePlaceSchema).max(10),
});

const createSchema = z.object({
  eventId: z.string().uuid(),
  type: z.enum(contestTypeIds),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  maxEntries: z.number().int().positive().max(10000).nullable().optional(),
  registrationDeadline: dateSchema.nullable().optional(),
  day: dateSchema.nullable().optional(),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  maxEntries: z.number().int().positive().max(10000).nullable().optional(),
  registrationDeadline: dateSchema.nullable().optional(),
  isOpen: z.boolean().optional(),
  day: dateSchema.nullable().optional(),
  prizeCategories: z.array(prizeCategorySchema).max(8).optional(),
  regulationNotes: z.string().trim().max(1200).optional().or(z.literal("")),
});

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Revisa los datos de la convocatoria.", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const {
    eventId,
    type,
    name,
    description,
    maxEntries,
    registrationDeadline,
    day,
  } = parsed.data;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("contests")
    .insert({
      event_id: eventId,
      type,
      name,
      description: description || null,
      max_entries: maxEntries ?? null,
      registration_deadline: registrationDeadline || null,
      day: day || null,
      // La convocatoria nace con la premiación típica de su tipo, para
      // que el reglamento diga algo desde el primer momento; de ahí se
      // ajustan los montos edición con edición.
      prize_categories: getRegulationTemplate(type).defaultPrizes,
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { message: "No pudimos crear la convocatoria.", detail: error?.message },
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
  if (fields.name !== undefined) update.name = fields.name;
  if (fields.description !== undefined) update.description = fields.description || null;
  if (fields.maxEntries !== undefined) update.max_entries = fields.maxEntries;
  if (fields.registrationDeadline !== undefined)
    update.registration_deadline = fields.registrationDeadline;
  if (fields.isOpen !== undefined) update.is_open = fields.isOpen;
  if (fields.day !== undefined) update.day = fields.day;
  if (fields.prizeCategories !== undefined)
    update.prize_categories = fields.prizeCategories;
  if (fields.regulationNotes !== undefined)
    update.regulation_notes = fields.regulationNotes || null;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ message: "Nada que actualizar." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("contests")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { message: "No pudimos actualizar la convocatoria.", detail: error?.message },
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

  // Borrar la convocatoria se lleva a sus inscritos por delante (cascade),
  // así que sólo se permite cuando ya no queda nadie: es la diferencia
  // entre "me equivoqué al crearla" y "borré 30 participantes sin querer".
  const { count } = await supabase
    .from("contest_entries")
    .select("id", { count: "exact", head: true })
    .eq("contest_id", id);

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      {
        message: `Esta convocatoria tiene ${count} inscritos. Bórralos primero o ciérrala en vez de borrarla.`,
      },
      { status: 409 }
    );
  }

  const { error } = await supabase.from("contests").delete().eq("id", id);
  if (error) {
    return NextResponse.json(
      { message: "No pudimos borrar la convocatoria.", detail: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
