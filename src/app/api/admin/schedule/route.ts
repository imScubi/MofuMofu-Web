import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { eventDays } from "@/lib/eventDays";
import { SCHEDULE_TEMPLATE } from "@/lib/scheduleTemplate";
import type { EventRow } from "@/lib/types";

export const runtime = "nodejs";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeSchema = z.string().regex(/^\d{2}:\d{2}$/);

const createSchema = z.object({
  eventId: z.string().uuid(),
  day: dateSchema,
  startTime: timeSchema,
  endTime: timeSchema.optional().or(z.literal("")),
  title: z.string().trim().min(1).max(160),
  notes: z.string().trim().max(400).optional().or(z.literal("")),
  kind: z.enum(["montaje", "actividad"]),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  day: dateSchema.optional(),
  startTime: timeSchema.optional(),
  endTime: timeSchema.optional().or(z.literal("")),
  title: z.string().trim().min(1).max(160).optional(),
  notes: z.string().trim().max(400).optional().or(z.literal("")),
  kind: z.enum(["montaje", "actividad"]).optional(),
});

/** Crea un bloque suelto, o la plantilla completa si viene "template". */
export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const supabase = createAdminClient();

  // Plantilla: llena la edición con el cronograma de siempre, para no
  // teclear los mismos doce bloques cada vez.
  if (body?.template === true) {
    const eventId = z.string().uuid().safeParse(body.eventId);
    if (!eventId.success) {
      return NextResponse.json({ message: "Edición inválida." }, { status: 400 });
    }

    const { data: eventData } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId.data)
      .maybeSingle();
    const event = eventData as EventRow | null;
    if (!event) {
      return NextResponse.json({ message: "Esa edición no existe." }, { status: 404 });
    }

    const days = eventDays(event.date_start, event.date_end);
    const rows = days.flatMap((day, index) =>
      SCHEDULE_TEMPLATE.map((block) => ({
        event_id: event.id,
        day,
        start_time: block.startTime,
        end_time: block.endTime ?? null,
        title: block.title,
        notes: block.notes ?? null,
        kind: block.kind,
        // El primer día monta desde cero; los siguientes sólo revisan.
        ...(index > 0 && block.secondDayTitle ? { title: block.secondDayTitle } : {}),
      }))
    );

    const { data, error } = await supabase.from("event_schedule").insert(rows).select();
    if (error) {
      return NextResponse.json(
        { message: "No pudimos crear el itinerario.", detail: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(data);
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Revisa los datos del bloque.", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { eventId, day, startTime, endTime, title, notes, kind } = parsed.data;
  const { data, error } = await supabase
    .from("event_schedule")
    .insert({
      event_id: eventId,
      day,
      start_time: startTime,
      end_time: endTime || null,
      title,
      notes: notes || null,
      kind,
    })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { message: "No pudimos agregar el bloque.", detail: error?.message },
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
  if (fields.day !== undefined) update.day = fields.day;
  if (fields.startTime !== undefined) update.start_time = fields.startTime;
  if (fields.endTime !== undefined) update.end_time = fields.endTime || null;
  if (fields.title !== undefined) update.title = fields.title;
  if (fields.notes !== undefined) update.notes = fields.notes || null;
  if (fields.kind !== undefined) update.kind = fields.kind;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ message: "Nada que actualizar." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("event_schedule")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { message: "No pudimos actualizar el bloque.", detail: error?.message },
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
  const { error } = await supabase.from("event_schedule").delete().eq("id", id);
  if (error) {
    return NextResponse.json(
      { message: "No pudimos borrar el bloque.", detail: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
