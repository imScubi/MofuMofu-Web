import type { ContestTypeId } from "@/lib/contestTypes";

/**
 * Los reglamentos de los concursos.
 *
 * Antes eran PDFs sueltos: cambiar el premio del primer lugar de $1,000
 * a $2,000 obligaba a rehacer el documento y volver a subirlo, con el
 * riesgo de que el que estaba publicado siguiera diciendo lo viejo.
 *
 * Aquí el texto fijo vive en el código y lo que cambia entre ediciones
 * —el día, las cuotas, los cupos y los premios— sale de la base de
 * datos. El reglamento se arma al momento, así que siempre dice lo mismo
 * que el panel.
 */

// ---------------------------------------------------------------------
// Premios
// ---------------------------------------------------------------------

/** Un lugar premiado. Puede llevar dinero, porcentaje, especie o todo. */
export interface PrizePlace {
  /** Dinero fijo en pesos. 0 = sin premio en efectivo. */
  cash: number;
  /** Porcentaje de lo recaudado en su categoría. 0 = ninguno. */
  percent: number;
  /** Premio en especie: "Paquete de figuras", "Playera", etc. */
  other: string;
}

/**
 * Una premiación independiente dentro del concurso.
 *
 * Existe porque los concursos reales tienen más de una: dance cover
 * premia por separado Grupal e Individual, y cosplay premia Adultos y
 * Niños. Cada una tiene su cuota y su bolsa.
 */
export interface PrizeCategory {
  label: string;
  /** Costo de entrada de esta categoría, en pesos. */
  entryFee: number;
  /** Cupo de esta categoría. null = sin límite propio. */
  slots: number | null;
  places: PrizePlace[];
}

const ORDINALS = [
  "1er lugar",
  "2do lugar",
  "3er lugar",
  "4to lugar",
  "5to lugar",
  "6to lugar",
  "7mo lugar",
  "8vo lugar",
  "9no lugar",
  "10mo lugar",
];

const MEDALS = ["🥇", "🥈", "🥉"];

/** "3er lugar" — más allá del décimo, "11º lugar". */
export function placeLabel(index: number): string {
  return ORDINALS[index] ?? `${index + 1}º lugar`;
}

/** La medalla del podio; del cuarto en adelante no lleva. */
export function placeMedal(index: number): string {
  return MEDALS[index] ?? "";
}

export function formatMoney(amount: number): string {
  return `$${amount.toLocaleString("es-MX")}`;
}

/**
 * El premio de un lugar, escrito como va en el reglamento:
 * "$1,000 + 30% de la recaudación de la categoría".
 */
export function describePrize(place: PrizePlace, categoryLabel?: string): string {
  const parts: string[] = [];
  if (place.cash > 0) parts.push(formatMoney(place.cash));
  if (place.percent > 0) {
    parts.push(
      `${place.percent}% de la recaudación${
        categoryLabel ? ` de ${categoryLabel.toLowerCase()}` : " total de entradas"
      }`
    );
  }
  if (place.other.trim()) parts.push(place.other.trim());
  return parts.length > 0 ? parts.join(" + ") : "Por definir";
}

// ---------------------------------------------------------------------
// Plantillas de texto
// ---------------------------------------------------------------------

export interface RegulationSection {
  title: string;
  /** Párrafos sueltos. */
  paragraphs?: string[];
  /** Viñetas. */
  bullets?: string[];
}

export interface RegulationTemplate {
  /** Título del documento, con su emoji, como en los PDFs originales. */
  title: string;
  /** Frase de arranque de la sección "Sobre la actividad". */
  about: string;
  /** Secciones antes del bloque de premios. */
  before: RegulationSection[];
  /** Secciones después del bloque de premios. */
  after: RegulationSection[];
  /** Nota al pie del bloque de premios. */
  prizeNote: string;
  /** Categorías propuestas al crear la convocatoria. */
  defaultPrizes: PrizeCategory[];
}

const CONDUCTA_COMUN =
  "Se espera un comportamiento respetuoso entre participantes, staff y público en todo momento.";

const GENERALES: RegulationSection = {
  title: "Disposiciones generales",
  bullets: [
    "La organización se reserva el derecho de modificar horarios o formato por causas de fuerza mayor, notificando oportunamente a los participantes.",
    "Al inscribirse, el participante acepta este reglamento en su totalidad.",
    "Cualquier situación no contemplada en este reglamento será resuelta por el staff organizador.",
  ],
};

export const REGULATION_TEMPLATES: Record<ContestTypeId | "videojuegos", RegulationTemplate> = {
  videojuegos: {
    title: "🎮 Torneo de Smash Bros.",
    about:
      "El Torneo de Smash Bros. es una competencia abierta al público asistente a MofuMofu Market, dirigida a jugadores de todos los niveles que deseen competir de forma amistosa y ordenada.",
    before: [
      {
        title: "Inscripción",
        bullets: [
          "El cupo es limitado y se asignará por orden de inscripción y pago.",
          "La inscripción se confirma únicamente al completar el pago de la entrada.",
          "Se recomienda llegar con al menos 30 minutos de anticipación al horario de inicio para el registro presencial.",
        ],
      },
      {
        title: "Formato de competencia",
        bullets: [
          "El torneo se disputará en formato de eliminación (a definir: simple o doble eliminación según número de inscritos).",
          "El personaje, escenario y reglas de combate (stocks, tiempo, ítems) serán anunciados por el organizador antes del inicio de cada ronda.",
          "El orden de los enfrentamientos (bracket) se publicará el día del evento antes del inicio del torneo.",
        ],
      },
    ],
    prizeNote:
      'La "recaudación" corresponde al monto total reunido por concepto de entradas de todos los participantes inscritos en este torneo.',
    after: [
      {
        title: "Conducta y descalificación",
        bullets: [
          CONDUCTA_COMUN,
          "Cualquier conducta antideportiva, uso de trampas, o falta de respeto hacia otros participantes u organizadores podrá resultar en descalificación inmediata sin derecho a reembolso.",
          "La decisión del staff organizador es inapelable.",
        ],
      },
      GENERALES,
    ],
    defaultPrizes: [
      {
        label: "General",
        entryFee: 50,
        slots: null,
        places: [
          { cash: 500, percent: 50, other: "" },
          { cash: 250, percent: 30, other: "" },
        ],
      },
    ],
  },

  dance_cover: {
    title: "💃 Mofu Dancer Cover",
    about:
      "Mofu Dancer Cover es una competencia de dance cover abierta a la comunidad K-Pop, con modalidades de participación grupal e individual. Cada modalidad cuenta con cupos limitados y premiación independiente.",
    before: [
      {
        title: "Inscripción y entradas",
        bullets: [
          "La inscripción se confirma únicamente al completar el pago correspondiente.",
          "Los cupos se asignarán por orden de inscripción y pago hasta agotar existencia en cada modalidad.",
          "Cada grupo deberá designar a un representante encargado de la comunicación con la organización.",
        ],
      },
      {
        title: "Formato de competencia",
        bullets: [
          "Cada participante o grupo realizará una presentación de cover dance (duración máxima a definir por la organización).",
          "Se recomienda entregar la pista musical con anticipación al staff técnico, en el formato y con el tiempo de antelación que la organización indique.",
          "El uso de vestuario, props y coreografía es libre, siempre que respete los lineamientos generales del evento.",
          "Un jurado evaluará las presentaciones según criterios como sincronía, ejecución técnica, interpretación y presentación escénica.",
        ],
      },
    ],
    prizeNote:
      "La recaudación de cada modalidad se calcula de forma independiente, considerando únicamente las entradas pagadas dentro de esa modalidad.",
    after: [
      {
        title: "Conducta y descalificación",
        bullets: [
          CONDUCTA_COMUN,
          "El vestuario debe ser apropiado para un evento familiar; la organización se reserva el derecho de solicitar ajustes de última hora.",
          "Faltas de respeto hacia otros participantes, staff o jurado podrán resultar en descalificación inmediata sin derecho a reembolso.",
          "La decisión del jurado es inapelable.",
        ],
      },
      GENERALES,
    ],
    defaultPrizes: [
      {
        label: "Modalidad Grupal",
        entryFee: 70,
        slots: 10,
        places: [
          { cash: 1000, percent: 30, other: "" },
          { cash: 750, percent: 20, other: "" },
        ],
      },
      {
        label: "Modalidad Individual",
        entryFee: 50,
        slots: 10,
        places: [
          { cash: 700, percent: 30, other: "" },
          { cash: 450, percent: 20, other: "" },
        ],
      },
    ],
  },

  cosplay: {
    title: "🗡️ Hanzo Cosplay Conquest",
    about:
      "Hanzo Cosplay Conquest es la competencia de cosplay de MofuMofu Market, dividida en categorías con premiación independiente.",
    before: [
      {
        title: "Categorías",
        bullets: [
          "Categoría Adultos: abierta a participantes mayores de edad (o rango de edad que la organización defina).",
          "Categoría Niños: dirigida a participantes menores de edad. Se recomienda la presencia de un adulto responsable durante el registro y la presentación.",
        ],
      },
      {
        title: "Inscripción y entradas",
        bullets: [
          "La inscripción se confirma únicamente al completar el pago correspondiente y el cupo se asigna por orden de registro.",
        ],
      },
      {
        title: "Formato de competencia",
        bullets: [
          "Cada participante realizará una presentación en tarima (tiempo máximo a definir por la organización), pudiendo incluir performance, música y/o props relacionados con el personaje representado.",
          "El cosplay debe ser de elaboración propia o adquirida; se recomienda indicar en la ficha de inscripción el personaje y la obra de origen.",
          "Un jurado evaluará según criterios como fidelidad al personaje, calidad de confección/elaboración, performance en tarima y presentación general.",
        ],
      },
      {
        title: "Normas de vestuario y props",
        bullets: [
          "No se permiten armas reales, filos reales, ni materiales peligrosos. Los props tipo arma deben ser de utilería (foam, plástico, madera sin filo) y podrán ser inspeccionados por el staff antes del ingreso.",
          "El vestuario debe ser apropiado para un evento familiar; no se permite desnudez ni contenido explícito.",
          "La organización se reserva el derecho de solicitar ajustes de vestuario o props antes de la presentación.",
        ],
      },
    ],
    prizeNote:
      "La recaudación de cada categoría se calcula de forma independiente, considerando únicamente las entradas pagadas dentro de esa categoría.",
    after: [
      {
        title: "Conducta y descalificación",
        bullets: [
          "Se espera respeto entre participantes, staff, jurado y público en todo momento.",
          "El incumplimiento de las normas de vestuario/props, o faltas de respeto durante la competencia, podrán resultar en descalificación inmediata sin derecho a reembolso.",
          "La decisión del jurado es inapelable.",
        ],
      },
      {
        title: "Disposiciones generales",
        bullets: [
          "La organización se reserva el derecho de modificar horarios por causas de fuerza mayor, notificando oportunamente a los participantes.",
          "Al inscribirse, el participante (o su representante/tutor en el caso de la categoría Niños) acepta este reglamento en su totalidad.",
          "Cualquier situación no contemplada en este reglamento será resuelta por el staff organizador.",
        ],
      },
    ],
    defaultPrizes: [
      {
        label: "Categoría Adultos",
        entryFee: 100,
        slots: null,
        places: [
          { cash: 2000, percent: 40, other: "" },
          { cash: 1000, percent: 20, other: "" },
        ],
      },
      {
        label: "Categoría Niños",
        entryFee: 50,
        slots: null,
        places: [
          { cash: 1000, percent: 50, other: "" },
          { cash: 500, percent: 30, other: "" },
        ],
      },
    ],
  },

  tcg: {
    title: "🃏 Torneo TCG",
    about:
      "El Torneo TCG es una competencia de cartas coleccionables abierta al público asistente a MofuMofu Market, para jugadores de todos los niveles.",
    before: [
      {
        title: "Inscripción",
        bullets: [
          "El cupo es limitado y se asignará por orden de inscripción y pago.",
          "La inscripción se confirma únicamente al completar el pago de la entrada.",
          "Cada jugador debe llevar su propio mazo, en regla con el formato anunciado.",
          "Se recomienda llegar con al menos 30 minutos de anticipación para el registro presencial.",
        ],
      },
      {
        title: "Formato de competencia",
        bullets: [
          "El formato y el sistema de rondas se anunciarán antes del inicio del torneo, según el número de inscritos.",
          "Las reglas oficiales del juego correspondiente aplican en todo lo no previsto por este reglamento.",
          "El emparejamiento de cada ronda lo publica el staff antes de comenzar.",
        ],
      },
    ],
    prizeNote:
      'La "recaudación" corresponde al monto total reunido por concepto de entradas de todos los participantes inscritos en este torneo.',
    after: [
      {
        title: "Conducta y descalificación",
        bullets: [
          CONDUCTA_COMUN,
          "Cualquier conducta antideportiva, trampa o falta de respeto podrá resultar en descalificación inmediata sin derecho a reembolso.",
          "La decisión del staff organizador es inapelable.",
        ],
      },
      GENERALES,
    ],
    defaultPrizes: [
      {
        label: "General",
        entryFee: 50,
        slots: null,
        places: [
          { cash: 500, percent: 50, other: "" },
          { cash: 250, percent: 30, other: "" },
        ],
      },
    ],
  },

  otro: {
    title: "✨ Concurso",
    about: "Competencia abierta al público asistente a MofuMofu Market.",
    before: [
      {
        title: "Inscripción",
        bullets: [
          "El cupo es limitado y se asignará por orden de inscripción y pago.",
          "La inscripción se confirma únicamente al completar el pago correspondiente.",
        ],
      },
    ],
    prizeNote:
      'La "recaudación" corresponde al monto total reunido por concepto de entradas de los participantes inscritos.',
    after: [
      {
        title: "Conducta y descalificación",
        bullets: [
          CONDUCTA_COMUN,
          "Faltas de respeto o conducta antideportiva podrán resultar en descalificación inmediata sin derecho a reembolso.",
          "La decisión del staff organizador es inapelable.",
        ],
      },
      GENERALES,
    ],
    defaultPrizes: [
      {
        label: "General",
        entryFee: 0,
        slots: null,
        places: [{ cash: 0, percent: 0, other: "Por definir" }],
      },
    ],
  },
};

export function getRegulationTemplate(typeId: string): RegulationTemplate {
  return (
    REGULATION_TEMPLATES[typeId as ContestTypeId] ?? REGULATION_TEMPLATES.otro
  );
}

/**
 * Lee las categorías guardadas de una convocatoria.
 *
 * Lo que viene de la base es jsonb, o sea "cualquier cosa": si una
 * categoría quedó a medias por un guardado viejo, se completa con
 * valores neutros en vez de romper el reglamento.
 */
export function parsePrizeCategories(raw: unknown): PrizeCategory[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((item): PrizeCategory[] => {
    if (!item || typeof item !== "object") return [];
    const category = item as Record<string, unknown>;

    const places = Array.isArray(category.places)
      ? category.places.flatMap((p): PrizePlace[] => {
          if (!p || typeof p !== "object") return [];
          const place = p as Record<string, unknown>;
          return [
            {
              cash: Number(place.cash) || 0,
              percent: Number(place.percent) || 0,
              other: typeof place.other === "string" ? place.other : "",
            },
          ];
        })
      : [];

    return [
      {
        label: typeof category.label === "string" ? category.label : "General",
        entryFee: Number(category.entryFee) || 0,
        slots:
          category.slots === null || category.slots === undefined
            ? null
            : Number(category.slots) || null,
        places,
      },
    ];
  });
}
