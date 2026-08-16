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
  const { error } = await supabase
    .from("contest_entries")
    .update({ status: body.data.status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { message: "No se pudo actualizar la inscripción." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

/**
 * Borra una inscripción. Es irreversible y libera su lugar: el contador
 * de la convocatoria lo ajusta un trigger, así que "lugares libres"
 * queda correcto sin tocar nada más. Para descartar a alguien sin
 * perder el historial está PATCH con status "rejected" — pero ojo: un
 * rechazado sigue ocupando cupo, justamente para que rechazar no le
 * regale el lugar al siguiente sin que tú lo decidas.
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

  const { error } = await supabase.from("contest_entries").delete().eq("id", id);
  if (error) {
    return NextResponse.json(
      { message: "No se pudo borrar la inscripción." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
