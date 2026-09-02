import type { PricingPlan } from "@/lib/eventConfig";

/**
 * Quién cabe en cada stand, día por día.
 *
 * Un stand no tiene un estado: tiene uno por día, y dentro de cada día
 * puede caber un expositor exclusivo o dos que comparten. Las reglas:
 *
 *   · Con un exclusivo, ese día está tomado y no cabe nadie más.
 *   · Con compartidos caben dos, y sólo entre ellos — quien quiere el
 *     stand entero no puede meterse en un espacio que ya se comparte.
 *   · Los días que nadie pidió siguen libres, aunque el stand aparezca
 *     con gente el otro día.
 *
 * Es la copia exacta de lo que hace `stand_admits` en la base. Aquí
 * sirve para no ofrecer lugares imposibles; allá para que no entren
 * aunque alguien lo intente por su cuenta.
 */

/** Una fila de la ocupación pública: sin nombres ni teléfonos. */
export interface StandOccupancy {
  stand_id: string;
  day: string;
  is_shared: boolean;
  taken: number;
}

export type StandFit =
  /** Libre los dos días (o el único que tiene la edición). */
  | { kind: "libre" }
  /** Cabes, pero sólo porque vas un día: el otro ya tiene dueño. */
  | { kind: "parcial"; freeDays: string[]; busyDays: string[] }
  /** Cabes compartiendo el espacio con quien ya está. */
  | { kind: "compartido"; withDays: string[] }
  /** No cabes, y el motivo. */
  | { kind: "ocupado"; reason: string };

export function isSelectable(fit: StandFit): boolean {
  return fit.kind !== "ocupado";
}

/** Lo que ocupa cada día de un stand. */
function dayLoad(occupancy: StandOccupancy[], standId: string, day: string) {
  const rows = occupancy.filter((o) => o.stand_id === standId && o.day === day);
  return {
    exclusive: rows
      .filter((o) => !o.is_shared)
      .reduce((total, o) => total + o.taken, 0),
    shared: rows
      .filter((o) => o.is_shared)
      .reduce((total, o) => total + o.taken, 0),
  };
}

/**
 * ¿Cabe este plan en este stand?
 *
 * `wantedDays` son los días que ocuparía: uno solo, o todos los de la
 * edición si el plan es de dos días.
 */
export function standFit({
  occupancy,
  standId,
  eventDays,
  wantedDays,
  shared,
}: {
  occupancy: StandOccupancy[];
  standId: string;
  eventDays: string[];
  wantedDays: string[];
  shared: boolean;
}): StandFit {
  for (const day of wantedDays) {
    const { exclusive, shared: sharedCount } = dayLoad(occupancy, standId, day);

    if (exclusive > 0) {
      return { kind: "ocupado", reason: "Ya tiene expositor ese día." };
    }
    if (sharedCount > 0 && !shared) {
      return {
        kind: "ocupado",
        reason: "Ese espacio ya se está compartiendo; elige un plan compartido.",
      };
    }
    if (sharedCount >= 2) {
      return { kind: "ocupado", reason: "El espacio compartido ya está completo." };
    }
  }

  // Cabe. Ahora, ¿cómo se lo explicamos?
  const shareWith = wantedDays.filter(
    (day) => dayLoad(occupancy, standId, day).shared > 0
  );
  if (shareWith.length > 0) {
    return { kind: "compartido", withDays: shareWith };
  }

  const busyDays = eventDays.filter((day) => {
    const { exclusive, shared: sharedCount } = dayLoad(occupancy, standId, day);
    return exclusive > 0 || sharedCount > 0;
  });
  if (busyDays.length > 0) {
    return {
      kind: "parcial",
      freeDays: wantedDays,
      busyDays,
    };
  }

  return { kind: "libre" };
}

/** Los días que ocuparía un plan: el elegido, o todos los de la edición. */
export function daysForPlan(
  plan: PricingPlan,
  eventDays: string[],
  chosenDay: string
): string[] {
  if (plan.days >= 2 || eventDays.length === 1) return eventDays;
  return chosenDay ? [chosenDay] : [];
}
