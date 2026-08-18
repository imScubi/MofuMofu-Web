import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { RESERVABLE_STAND_IDS } from "@/lib/standLayout";

export const runtime = "nodejs";

const standIds = z.array(z.string().trim().min(1)).max(RESERVABLE_STAND_IDS.length);
const planIds = z.array(z.string().trim().min(1)).max(40);

const createSchema = z.object({
  eventId: z.string().uuid(),
  label: z.string().trim().min(1).max(80),
  standIds,
  planIds,
  maxExhibitors: z.number().int().positive().nullable().optional(),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  label: z.string().trim().min(1).max(80).optional(),
  standIds: standIds.optional(),
  planIds: planIds.optional(),
  maxExhibitors: z.number().int().positive().nullable().optional(),
});

/** Un stand que no existe en el mapa dejaría la zona apuntando al aire. */
function unknownStands(ids: string[]): string[] {
  const valid = new Set(RESERVABLE_STAND_IDS);
  return ids.filter((id) => !valid.has(id));
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Revisa los datos de la zona.", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { eventId, label, standIds: stands, planIds: plans, maxExhibitors } = parsed.data;

  const missing = unknownStands(stands);
  if (missing.length > 0) {
    return NextResponse.json(
      { message: `Estos lugares no existen en el mapa: ${missing.join(", ")}.` },
      { status: 400 }
    );
  }

  if (plans.length === 0) {
    return NextResponse.json(
      { message: "Elige al menos un plan que pueda ocupar la zona." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("event_zones")
    .insert({
      event_id: eventId,
      label,
      stand_ids: stands,
      plan_ids: plans,
      max_exhibitors: maxExhibitors ?? null,
    })
    .select()
    .single();

  if (error || !data) {
    console.error("create zone error", error);
    return NextResponse.json({ message: "No pudimos crear la zona." }, { status: 500 });
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

  if (fields.label !== undefined) update.label = fields.label;
  if (fields.standIds !== undefined) {
    const missing = unknownStands(fields.standIds);
    if (missing.length > 0) {
      return NextResponse.json(
        { message: `Estos lugares no existen en el mapa: ${missing.join(", ")}.` },
        { status: 400 }
      );
    }
    update.stand_ids = fields.standIds;
  }
  if (fields.planIds !== undefined) {
    if (fields.planIds.length === 0) {
      return NextResponse.json(
        { message: "La zona necesita al menos un plan que pueda ocuparla." },
        { status: 400 }
      );
    }
    update.plan_ids = fields.planIds;
  }
  if (fields.maxExhibitors !== undefined) update.max_exhibitors = fields.maxExhibitors;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ message: "Nada que actualizar." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("event_zones")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    console.error("update zone error", error);
    return NextResponse.json(
      { message: "No pudimos guardar el cambio." },
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
    return NextResponse.json({ message: "Falta la zona." }, { status: 400 });
  }

  // Borrar la zona sólo suelta la regla: los expositores que ya estaban
  // ahí se quedan donde están.
  const supabase = createAdminClient();
  const { error } = await supabase.from("event_zones").delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      { message: "No pudimos eliminar la zona." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
