import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { RESERVABLE_STAND_IDS } from "@/lib/standLayout";

export const runtime = "nodejs";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  dateStart: dateSchema,
  dateEnd: dateSchema,
  paymentDeadline: dateSchema,
  restrictedGirosEnabled: z.boolean(),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(120).optional(),
  dateStart: dateSchema.optional(),
  dateEnd: dateSchema.optional(),
  paymentDeadline: dateSchema.optional(),
  restrictedGirosEnabled: z.boolean().optional(),
  isOpen: z.boolean().optional(),
});

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Revisa los datos de la edición.", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { name, dateStart, dateEnd, paymentDeadline, restrictedGirosEnabled } =
    parsed.data;

  if (dateEnd < dateStart) {
    return NextResponse.json(
      { message: "La fecha de fin no puede ser anterior a la de inicio." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      name,
      date_start: dateStart,
      date_end: dateEnd,
      payment_deadline: paymentDeadline,
      restricted_giros_enabled: restrictedGirosEnabled,
    })
    .select()
    .single();

  if (error || !event) {
    return NextResponse.json(
      { message: "No pudimos crear la edición." },
      { status: 500 }
    );
  }

  // Cada edición arranca con todos los stands disponibles.
  const { error: standsError } = await supabase.from("event_stands").insert(
    RESERVABLE_STAND_IDS.map((standId) => ({
      event_id: event.id,
      stand_id: standId,
      status: "available",
    }))
  );

  if (standsError) {
    await supabase.from("events").delete().eq("id", event.id);
    return NextResponse.json(
      { message: "No pudimos preparar el mapa de stands de la edición." },
      { status: 500 }
    );
  }

  return NextResponse.json(event);
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
  if (fields.dateStart !== undefined) update.date_start = fields.dateStart;
  if (fields.dateEnd !== undefined) update.date_end = fields.dateEnd;
  if (fields.paymentDeadline !== undefined)
    update.payment_deadline = fields.paymentDeadline;
  if (fields.restrictedGirosEnabled !== undefined)
    update.restricted_giros_enabled = fields.restrictedGirosEnabled;
  if (fields.isOpen !== undefined) update.is_open = fields.isOpen;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ message: "Nada que actualizar." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("events")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { message: "No pudimos actualizar la edición." },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
