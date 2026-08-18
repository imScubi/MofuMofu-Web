import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const schema = z.object({
  status: z.enum(["pending_review", "approved", "rejected", "cancelled"]).optional(),
  /** Para corregir una falta de ortografía sin borrar el registro. */
  businessName: z.string().trim().min(1).max(200).optional(),
  /** Descuento interno: sin motivo, es una decisión del organizador. */
  discountType: z.enum(["percent", "amount"]).nullable().optional(),
  discountValue: z.number().min(0).max(1000000).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const body = schema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ message: "Datos inválidos." }, { status: 400 });
  }
  if (
    body.data.status === undefined &&
    body.data.businessName === undefined &&
    body.data.discountType === undefined &&
    body.data.discountValue === undefined
  ) {
    return NextResponse.json({ message: "Nada que actualizar." }, { status: 400 });
  }

  // Un porcentaje mayor a 100 no es un descuento, es un regalo con
  // cambio: el total quedaría negativo.
  if (
    body.data.discountType === "percent" &&
    body.data.discountValue !== undefined &&
    body.data.discountValue > 100
  ) {
    return NextResponse.json(
      { message: "Un descuento en porcentaje no puede pasar de 100%." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data: registration, error: fetchError } = await supabase
    .from("registrations")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !registration) {
    return NextResponse.json({ message: "Registro no encontrado." }, { status: 404 });
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.data.status !== undefined) update.status = body.data.status;
  if (body.data.businessName !== undefined)
    update.business_name = body.data.businessName;
  if (body.data.discountType !== undefined) {
    update.discount_type = body.data.discountType;
    // Quitar el tipo sin quitar el número dejaría un descuento fantasma
    // guardado, listo para revivir al volver a elegir tipo.
    if (body.data.discountType === null) update.discount_value = 0;
  }
  if (body.data.discountValue !== undefined)
    update.discount_value = body.data.discountValue;

  const { error: updateRegError } = await supabase
    .from("registrations")
    .update(update)
    .eq("id", id);

  if (updateRegError) {
    return NextResponse.json({ message: "No se pudo actualizar el registro." }, { status: 500 });
  }

  // Sin cambio de estatus no hay nada que hacer con el stand.
  if (body.data.status === undefined) {
    return NextResponse.json({ ok: true });
  }

  // Rechazado y cancelado devuelven el lugar al mapa; la diferencia es
  // que el cancelado ya estaba en el plan logístico y deja un hueco que
  // el reacomodo puede cerrar.
  const standStatus =
    body.data.status === "approved"
      ? "sold"
      : body.data.status === "rejected" || body.data.status === "cancelled"
        ? "available"
        : "pending";

  await supabase
    .from("event_stands")
    .update({ status: standStatus, updated_at: new Date().toISOString() })
    .eq("event_id", registration.event_id)
    .eq("stand_id", registration.stand_id);

  return NextResponse.json({ ok: true });
}

/**
 * Borra un registro por completo: libera su stand en esa edición y
 * elimina sus comprobantes del Storage. Es irreversible — se usa para
 * limpiar registros de prueba o duplicados, no para rechazar (para eso
 * está PATCH con status "rejected", que conserva el historial).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: registration, error: fetchError } = await supabase
    .from("registrations")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !registration) {
    return NextResponse.json({ message: "Registro no encontrado." }, { status: 404 });
  }

  const { error: deleteError } = await supabase
    .from("registrations")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json(
      { message: "No se pudo borrar el registro." },
      { status: 500 }
    );
  }

  // El stand vuelve a estar disponible en esa edición.
  await supabase
    .from("event_stands")
    .update({ status: "available", updated_at: new Date().toISOString() })
    .eq("event_id", registration.event_id)
    .eq("stand_id", registration.stand_id);

  // Los comprobantes ya no le sirven a nadie: se van con el registro.
  const proofPaths = [
    registration.payment_proof_path,
    registration.payment_proof_path_2,
  ].filter((p): p is string => Boolean(p));

  if (proofPaths.length > 0) {
    await supabase.storage.from("payment-proofs").remove(proofPaths);
  }

  return NextResponse.json({ ok: true });
}
