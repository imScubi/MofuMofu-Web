import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const schema = z.object({
  status: z.enum(["pending_review", "approved", "rejected"]),
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
    return NextResponse.json({ message: "Estatus inválido." }, { status: 400 });
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

  const { error: updateRegError } = await supabase
    .from("registrations")
    .update({ status: body.data.status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (updateRegError) {
    return NextResponse.json({ message: "No se pudo actualizar el registro." }, { status: 500 });
  }

  const standStatus =
    body.data.status === "approved"
      ? "sold"
      : body.data.status === "rejected"
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
