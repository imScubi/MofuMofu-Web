import type { ContestRow } from "@/lib/types";

export interface ContestAvailability {
  /** Se puede inscribir gente ahora mismo. */
  open: boolean;
  /** Lugares que quedan, o null si la convocatoria no tiene cupo. */
  spotsLeft: number | null;
  /** Motivo por el que está cerrada, listo para mostrar. */
  closedReason: string | null;
}

/**
 * La misma regla que aplica register_contest_entry() en la base de
 * datos, para poder avisarlo antes de que alguien llene el formulario.
 * La verdad sigue siendo la de la base: aquí sólo se adelanta el aviso.
 */
export function contestAvailability(contest: ContestRow): ContestAvailability {
  const spotsLeft =
    contest.max_entries == null
      ? null
      : Math.max(contest.max_entries - contest.entries_count, 0);

  if (!contest.is_open) {
    return { open: false, spotsLeft, closedReason: "Las inscripciones están cerradas." };
  }

  if (contest.registration_deadline) {
    // Comparar como texto YYYY-MM-DD evita que el huso horario del
    // navegador adelante o atrase el cierre un día.
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "America/Monterrey",
    });
    if (today > contest.registration_deadline) {
      return {
        open: false,
        spotsLeft,
        closedReason: "Ya pasó la fecha límite de inscripción.",
      };
    }
  }

  if (spotsLeft === 0) {
    return { open: false, spotsLeft, closedReason: "Se agotaron los lugares." };
  }

  return { open: true, spotsLeft, closedReason: null };
}
