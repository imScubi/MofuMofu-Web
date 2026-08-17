/**
 * El cronograma de siempre, sacado del plan logístico de agosto.
 *
 * Al crear una edición se puede volcar de golpe y luego ajustar horas o
 * actividades: escribir doce bloques a mano cada vez es justo el trabajo
 * que este panel viene a quitar.
 *
 * Los bloques de montaje se repiten los dos días, pero el primer día se
 * arma todo desde cero y los siguientes sólo se revisa — de ahí
 * "secondDayTitle".
 */

export interface ScheduleTemplateBlock {
  startTime: string;
  endTime?: string;
  title: string;
  notes?: string;
  kind: "montaje" | "actividad";
  /** Título alterno del segundo día en adelante. */
  secondDayTitle?: string;
}

export const SCHEDULE_TEMPLATE: readonly ScheduleTemplateBlock[] = [
  {
    startTime: "15:00",
    title: "Arribo del staff y recepción del proveedor de infraestructura",
    notes:
      "Toldos, mesas y sillas. Inicio del montaje del escenario principal.",
    kind: "montaje",
    secondDayTitle:
      "Arribo del staff y de los proveedores para revisión de infraestructura",
  },
  {
    startTime: "16:00",
    title: "Llegada gradual de expositores y montaje de stands",
    kind: "montaje",
    secondDayTitle: "Reanudación de la llegada gradual de expositores",
  },
  {
    startTime: "17:30",
    title: "Límite de montaje e inicio de mercado",
    kind: "montaje",
  },
  {
    startTime: "18:00",
    endTime: "19:00",
    title: "Actividad por definir",
    kind: "actividad",
  },
  {
    startTime: "19:00",
    endTime: "20:00",
    title: "Actividad por definir",
    kind: "actividad",
  },
  {
    startTime: "21:00",
    endTime: "22:00",
    title: "Lotería MofuMofu",
    kind: "actividad",
  },
  {
    startTime: "22:00",
    endTime: "22:30",
    title: "Cierre",
    kind: "actividad",
  },
];
