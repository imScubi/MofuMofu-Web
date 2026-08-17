import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateMoves } from "@/lib/reaccommodation";
import type { RegistrationRow } from "@/lib/types";

export const runtime = "nodejs";

const schema = z.object({
  eventId: z.string().uuid(),
  moves: z
    .array(
      z.object({
        registrationId: z.string().uuid(),
        from: z.string().min(1),
        to: z.string().min(1),
      })
    )
    .min(1)
    .max(60),
});

/**
 * Aplica un reacomodo: mueve expositores de stand dentro de una edición.
 *
 * Se hace en dos pasadas contra event_stands — primero se liberan todos
 * los lugares de origen y luego se ocupan los destinos — porque en un
 * recorrido el destino de uno es el origen de otro, y marcarlos de uno
 * en uno chocaría consigo mismo a la mitad.
 */
export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Movimientos inválidos." }, { status: 400 });
  }

  const { eventId, moves } = parsed.data;
  const supabase = createAdminClient();

  const { data: registrationsData } = await supabase
    .from("registrations")
    .select("*")
    .eq("event_id", eventId);
  const registrations = (registrationsData as RegistrationRow[]) ?? [];

  // Cada movimiento debe corresponder a un registro real de esta edición
  // que hoy esté justo donde dice el movimiento.
  const byId = new Map(registrations.map((r) => [r.id, r]));
  const enriched = [];
  for (const move of moves) {
    const registration = byId.get(move.registrationId);
    if (!registration) {
      return NextResponse.json(
        { message: "Uno de los registros ya no existe. Recarga la página." },
        { status: 409 }
      );
    }
    if (registration.stand_id !== move.from) {
      return NextResponse.json(
        {
          message: `${registration.business_name} ya no está en el stand ${move.from}. Recarga la página y vuelve a calcular.`,
        },
        { status: 409 }
      );
    }
    enriched.push({ ...move, businessName: registration.business_name });
  }

  const invalid = validateMoves(enriched, registrations);
  if (invalid) {
    return NextResponse.json({ message: invalid }, { status: 400 });
  }

  const now = new Date().toISOString();

  for (const move of moves) {
    const { error } = await supabase
      .from("registrations")
      .update({ stand_id: move.to, updated_at: now })
      .eq("id", move.registrationId);

    if (error) {
      return NextResponse.json(
        { message: "No pudimos mover un expositor.", detail: error.message },
        { status: 500 }
      );
    }
  }

  const origins = moves.map((m) => m.from);
  const destinations = moves.map((m) => m.to);

  await supabase
    .from("event_stands")
    .update({ status: "available", updated_at: now })
    .eq("event_id", eventId)
    .in("stand_id", origins);

  for (const move of moves) {
    const registration = byId.get(move.registrationId)!;
    await supabase
      .from("event_stands")
      .update({
        status: registration.status === "approved" ? "sold" : "pending",
        updated_at: now,
      })
      .eq("event_id", eventId)
      .eq("stand_id", move.to);
  }

  return NextResponse.json({ ok: true, moved: moves.length, destinations });
}
