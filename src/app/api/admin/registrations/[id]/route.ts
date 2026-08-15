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
    .from("stands")
    .update({ status: standStatus, updated_at: new Date().toISOString() })
    .eq("id", registration.stand_id);

  return NextResponse.json({ ok: true });
}
