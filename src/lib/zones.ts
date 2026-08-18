import { PRICING_PLANS, type PricingPlan } from "@/lib/eventConfig";
import type { EventZoneRow } from "@/lib/types";

/**
 * Zonas: qué lugares le tocan a cada plan.
 *
 * Las reglas son tres y salen todas de las zonas que el organizador
 * definió; no hay banderas extra que recordar:
 *
 *   1. Un stand que pertenece a una zona sólo lo pueden tomar los planes
 *      que esa zona lista.
 *   2. Si un plan aparece en alguna zona de la edición, ese plan sólo
 *      puede ocupar stands de las zonas que lo listan. Así "comida en el
 *      30-35" también significa "comida en ningún otro lado", sin tener
 *      que decirlo aparte.
 *   3. Una zona con tope no admite más expositores que ese número,
 *      aunque le sobren lugares.
 *
 * Un stand que no está en ninguna zona es de todos, y un plan que no
 * aparece en ninguna zona puede ir a cualquier lugar libre.
 */

export interface ZoneAvailability {
  /**
   * Los únicos stands que este plan puede tomar, o null si no está
   * zonificado. null no es "ninguno": es "cualquiera que no sea de otro".
   */
  allowedStands: Set<string> | null;
  /** Stands vedados: de otra zona, o de una zona suya que ya se llenó. */
  blockedStands: Set<string>;
  /** Zonas suyas que llegaron a su tope, con el motivo listo para mostrar. */
  fullZones: { label: string; reason: string }[];
}

/** Las zonas donde cabe un plan. */
export function zonesForPlan(zones: EventZoneRow[], planId: string): EventZoneRow[] {
  return zones.filter((z) => z.plan_ids.includes(planId));
}

/**
 * Cuántos expositores ocupan hoy una zona.
 *
 * Recibe la lista de stands ocupados y no los registros completos: al
 * mapa público no tiene por qué llegar el teléfono de nadie para saber
 * si una zona está llena.
 */
export function zoneOccupancy(zone: EventZoneRow, occupiedStands: string[]): number {
  return occupiedStands.filter((standId) => zone.stand_ids.includes(standId)).length;
}

/** Qué stands puede elegir alguien con este plan. */
export function availabilityForPlan(
  zones: EventZoneRow[],
  planId: string,
  occupiedStands: string[]
): ZoneAvailability {
  const mine = zonesForPlan(zones, planId);
  const others = zones.filter((z) => !z.plan_ids.includes(planId));

  // Los lugares de zonas ajenas están apartados para ellas, tenga o no
  // zona propia este plan.
  const blockedStands = new Set(others.flatMap((z) => z.stand_ids));
  const fullZones: { label: string; reason: string }[] = [];

  if (mine.length === 0) {
    return { allowedStands: null, blockedStands, fullZones };
  }

  const allowedStands = new Set<string>();
  for (const zone of mine) {
    const used = zoneOccupancy(zone, occupiedStands);
    if (zone.max_exhibitors != null && used >= zone.max_exhibitors) {
      fullZones.push({
        label: zone.label,
        reason: `${zone.label} ya llegó a su tope de ${zone.max_exhibitors} expositores.`,
      });
      for (const standId of zone.stand_ids) blockedStands.add(standId);
      continue;
    }
    for (const standId of zone.stand_ids) allowedStands.add(standId);
  }

  return { allowedStands, blockedStands, fullZones };
}

/**
 * ¿Puede este plan quedarse en este stand? Devuelve el motivo del "no",
 * o null si sí. Es la regla que aplica el servidor al reservar; el
 * formulario usa la misma para no ofrecer lugares imposibles.
 */
export function standRejectionReason(
  zones: EventZoneRow[],
  planId: string,
  standId: string,
  occupiedStands: string[]
): string | null {
  const zoneOfStand = zones.find((z) => z.stand_ids.includes(standId));
  const mine = zonesForPlan(zones, planId);

  if (zoneOfStand && !zoneOfStand.plan_ids.includes(planId)) {
    return `El stand ${standId} está reservado para ${zoneOfStand.label}.`;
  }

  if (mine.length > 0 && !zoneOfStand) {
    const labels = mine.map((z) => z.label).join(" o ");
    return `Con este plan sólo puedes elegir lugares de ${labels}.`;
  }

  if (zoneOfStand?.max_exhibitors != null) {
    const used = zoneOccupancy(zoneOfStand, occupiedStands);
    if (used >= zoneOfStand.max_exhibitors) {
      return `${zoneOfStand.label} ya llegó a su tope de ${zoneOfStand.max_exhibitors} expositores.`;
    }
  }

  return null;
}

// ---------------------------------------------------------------------
// Planes propios de la edición
// ---------------------------------------------------------------------

/**
 * Lee los planes extra guardados en la edición. Vienen de jsonb, o sea
 * "cualquier cosa": los que no traigan lo mínimo se descartan en vez de
 * romper el formulario con un precio vacío.
 */
export function parseExtraPlans(raw: unknown): PricingPlan[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((item): PricingPlan[] => {
    if (!item || typeof item !== "object") return [];
    const plan = item as Record<string, unknown>;

    const id = typeof plan.id === "string" ? plan.id.trim() : "";
    const categoryLabel =
      typeof plan.categoryLabel === "string" ? plan.categoryLabel.trim() : "";
    const price = Number(plan.price);
    const days = Number(plan.days) === 2 ? 2 : 1;

    if (!id || !categoryLabel || !Number.isFinite(price) || price < 0) return [];

    return [
      {
        id,
        category: "varios",
        categoryLabel,
        days,
        price,
        shared: Boolean(plan.shared),
      },
    ];
  });
}

/** Los seis de siempre más los que definió esta edición. */
export function plansForEvent(extraPlans: unknown): PricingPlan[] {
  const extras = parseExtraPlans(extraPlans);
  // Un plan propio con el mismo id que uno de fábrica gana: es una
  // decisión explícita de esta edición.
  const overridden = new Set(extras.map((p) => p.id));
  return [...PRICING_PLANS.filter((p) => !overridden.has(p.id)), ...extras];
}

export function findPlanForEvent(
  extraPlans: unknown,
  planId: string
): PricingPlan | undefined {
  return plansForEvent(extraPlans).find((p) => p.id === planId);
}

/**
 * ¿Está libre este stand para el plan elegido? Es la versión de
 * `standRejectionReason` que necesita el mapa: sólo sí o no, sobre
 * reglas ya calculadas, sin volver a recorrer las zonas por cada lugar.
 */
export function isStandAllowed(
  rules: ZoneAvailability | null,
  standId: string
): boolean {
  if (!rules) return true;
  if (rules.blockedStands.has(standId)) return false;
  return rules.allowedStands === null || rules.allowedStands.has(standId);
}

/**
 * Los stands que hoy cuentan como ocupados para el tope de una zona.
 * Un lugar apartado o en proceso de pago ya es de alguien; uno
 * bloqueado no es de nadie, así que no consume cupo.
 */
export function occupiedStandIds(
  stands: { stand_id: string; status: string }[]
): string[] {
  return stands
    .filter((s) => s.status === "sold" || s.status === "pending")
    .map((s) => s.stand_id);
}

// ---------------------------------------------------------------------
// Rangos de stands: "30-35, 12" ⇄ ["30","31",...,"35","12"]
// ---------------------------------------------------------------------

/**
 * Nadie quiere teclear treinta números. El organizador escribe rangos
 * como los dice en voz alta ("del 30 al 35") y aquí se convierten a la
 * lista de stands. Lo que no exista en el mapa se devuelve aparte, para
 * poder avisarlo en vez de guardarlo en silencio.
 */
export function parseStandRanges(
  text: string,
  validStandIds: string[]
): { standIds: string[]; unknown: string[] } {
  const valid = new Set(validStandIds);
  const standIds: string[] = [];
  const unknown: string[] = [];
  const seen = new Set<string>();

  const add = (id: string) => {
    if (!valid.has(id)) {
      if (!unknown.includes(id)) unknown.push(id);
      return;
    }
    if (seen.has(id)) return;
    seen.add(id);
    standIds.push(id);
  };

  for (const piece of text.split(/[,;\n]/)) {
    const part = piece.trim();
    if (!part) continue;

    // Guion normal, guion largo o "al": las tres formas de decir rango.
    const range = part.match(/^(\w+)\s*(?:-|–|a(?:l)?\s)\s*(\w+)$/i);
    if (range) {
      const from = Number(range[1]);
      const to = Number(range[2]);
      if (Number.isInteger(from) && Number.isInteger(to)) {
        const [lo, hi] = from <= to ? [from, to] : [to, from];
        for (let n = lo; n <= hi; n++) add(String(n));
        continue;
      }
    }

    add(part);
  }

  return { standIds, unknown };
}

/** El camino de vuelta: la lista guardada, escrita como rangos. */
export function formatStandRanges(standIds: string[]): string {
  const numbers = standIds
    .map((id) => Number(id))
    .filter((n) => Number.isInteger(n))
    .sort((a, b) => a - b);
  const others = standIds.filter((id) => !Number.isInteger(Number(id)));

  const parts: string[] = [];
  let start: number | null = null;
  let prev: number | null = null;

  const flush = () => {
    if (start == null || prev == null) return;
    parts.push(start === prev ? `${start}` : `${start}-${prev}`);
  };

  for (const n of numbers) {
    if (start == null) {
      start = prev = n;
      continue;
    }
    if (n === prev! + 1) {
      prev = n;
      continue;
    }
    flush();
    start = prev = n;
  }
  flush();

  return [...parts, ...others].join(", ");
}
