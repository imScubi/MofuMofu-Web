import { STAND_ROWS, rowOfStand } from "@/lib/standLayout";
import type { RegistrationRow } from "@/lib/types";

/**
 * Qué hacer con los huecos que deja una cancelación.
 *
 * Un hueco no es cualquier stand libre: es un lugar vacío que quedó
 * *en medio* de expositores. Los libres del final de una fila no
 * estorban — ahí simplemente no llegó nadie.
 *
 * Se proponen dos salidas para cada hueco, nunca se aplica nada solo:
 *
 *   - "Traer al último": mueve UN expositor, el del final de la fila.
 *     Es el que menos molesta y el que casi siempre conviene.
 *   - "Recorrer la fila": mueve a todos los que están después del hueco
 *     un lugar hacia atrás. Deja la fila perfectamente compacta pero
 *     cambia de lugar a mucha gente que ya sabía dónde iba.
 *
 * Quien decide es el organizador: el sistema sólo hace las cuentas.
 */

export interface StandMove {
  registrationId: string;
  businessName: string;
  from: string;
  to: string;
}

export interface GapPlan {
  /** El stand vacío que quedó en medio. */
  gap: string;
  rowLabel: string;
  /** Un solo movimiento: el último de la fila pasa al hueco. */
  pullLast: StandMove[];
  /** Todos los de después del hueco se recorren un lugar. */
  shiftAll: StandMove[];
}

/** Los stands que hoy están ocupados por un registro vigente. */
export function occupiedStands(
  registrations: RegistrationRow[]
): Map<string, RegistrationRow> {
  const map = new Map<string, RegistrationRow>();
  for (const r of registrations) {
    if (r.status === "rejected" || r.status === "cancelled") continue;
    map.set(r.stand_id, r);
  }
  return map;
}

export function findGapPlans(registrations: RegistrationRow[]): GapPlan[] {
  const occupied = occupiedStands(registrations);
  const plans: GapPlan[] = [];

  for (const row of STAND_ROWS) {
    // El último ocupado de la fila marca hasta dónde llega la gente:
    // más allá de él, los vacíos no son huecos.
    const lastOccupiedIndex = row.stands.reduce(
      (last, standId, index) => (occupied.has(standId) ? index : last),
      -1
    );
    if (lastOccupiedIndex < 0) continue;

    row.stands.slice(0, lastOccupiedIndex).forEach((standId, index) => {
      if (occupied.has(standId)) return;

      const lastStandId = row.stands[lastOccupiedIndex];
      const lastRegistration = occupied.get(lastStandId)!;

      const pullLast: StandMove[] = [
        {
          registrationId: lastRegistration.id,
          businessName: lastRegistration.business_name,
          from: lastStandId,
          to: standId,
        },
      ];

      // Recorrer: cada ocupado después del hueco se mueve al lugar
      // ocupado (o vacío) anterior de la misma fila.
      const shiftAll: StandMove[] = [];
      let target = standId;
      for (const nextId of row.stands.slice(index + 1, lastOccupiedIndex + 1)) {
        const registration = occupied.get(nextId);
        if (!registration) continue;
        shiftAll.push({
          registrationId: registration.id,
          businessName: registration.business_name,
          from: nextId,
          to: target,
        });
        target = nextId;
      }

      plans.push({ gap: standId, rowLabel: row.label, pullLast, shiftAll });
    });
  }

  return plans;
}

/**
 * Valida un conjunto de movimientos antes de aplicarlo: dos expositores
 * no pueden acabar en el mismo stand, y nadie puede caer en un lugar que
 * sigue ocupado por alguien que no se mueve.
 */
export function validateMoves(
  moves: StandMove[],
  registrations: RegistrationRow[]
): string | null {
  if (moves.length === 0) return "No hay movimientos que aplicar.";

  const occupied = occupiedStands(registrations);
  const moving = new Set(moves.map((m) => m.from));
  const destinations = new Set<string>();

  for (const move of moves) {
    if (!rowOfStand(move.to)) {
      return `El stand ${move.to} no existe en el plano.`;
    }
    if (destinations.has(move.to)) {
      return `Dos expositores quedarían en el stand ${move.to}.`;
    }
    destinations.add(move.to);

    const occupant = occupied.get(move.to);
    if (occupant && !moving.has(move.to)) {
      return `El stand ${move.to} sigue ocupado por ${occupant.business_name}.`;
    }
  }

  return null;
}
