// Las preguntas de las encuestas de retroalimentación.
//
// Viven aquí y no en la base de datos a propósito: así crear la encuesta
// de la siguiente edición es un clic y todas las ediciones quedan
// comparables entre sí, porque preguntan exactamente lo mismo. Las
// respuestas se guardan en survey_responses.answers con el "id" de cada
// pregunta como llave.
//
// Regla: NO cambies el "id" de una pregunta que ya recibió respuestas —
// las viejas quedarían huérfanas. Cambiar el texto sí es seguro.

export type SurveyQuestionType = "scale" | "choice" | "text";

export interface SurveyQuestion {
  id: string;
  label: string;
  type: SurveyQuestionType;
  required: boolean;
  /** scale: extremos de la escala (inclusive). */
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  /** choice: opciones exactas. */
  options?: readonly string[];
  /** text: caja de varias líneas. */
  multiline?: boolean;
}

export interface SurveyTemplate {
  id: string;
  label: string;
  defaultTitle: string;
  defaultIntro: string;
  questions: readonly SurveyQuestion[];
}

const SI_NO = ["Sí", "No"] as const;

export const SURVEY_TEMPLATES: readonly SurveyTemplate[] = [
  {
    id: "expositores",
    label: "Retroalimentación de expositores",
    defaultTitle: "Encuesta de retroalimentación para expositores",
    defaultIntro:
      "¡Hola! 🌸 Gracias por ser parte de MofuMofu Market. Queremos saber cómo te fue como expositor: qué te gustó, qué podemos mejorar y cualquier sugerencia que tengas para futuras ediciones. 🙏 Agradecemos mucho tu tiempo y sinceridad. ¡Tu retroalimentación nos ayuda a crear un evento más bonito, organizado y divertido para todos! ✨ ¡Gracias por confiar en nosotros!",
    questions: [
      {
        id: "experienciaGeneral",
        label:
          "¿Cómo calificarías tu experiencia general como expositor en MofuMofu Market?",
        type: "scale",
        required: true,
        scaleMin: 1,
        scaleMax: 5,
        scaleMinLabel: "Muy mala",
        scaleMaxLabel: "Excelente",
      },
      {
        id: "informado",
        label:
          "¿Te sentiste bien informado(a) y acompañado(a) antes y durante el evento?",
        type: "choice",
        required: true,
        options: SI_NO,
      },
      {
        id: "organizacion",
        label: "¿Cómo calificarías la organización general del evento?",
        type: "scale",
        required: true,
        scaleMin: 1,
        scaleMax: 5,
        scaleMinLabel: "Muy mala",
        scaleMaxLabel: "Excelente",
      },
      {
        id: "expectativas",
        label: "¿Consideras que el evento cumplió tus expectativas como expositor?",
        type: "text",
        required: true,
        multiline: true,
      },
      {
        id: "espacio",
        label: "¿Qué te pareció el espacio asignado para tu stand?",
        type: "choice",
        required: true,
        options: ["Cómodo", "Aceptable", "Inadecuado"],
      },
      {
        id: "comunicacion",
        label: "¿Cómo calificarías la comunicación con el equipo organizador?",
        type: "scale",
        required: true,
        scaleMin: 1,
        scaleMax: 5,
        scaleMinLabel: "Muy mala",
        scaleMaxLabel: "Excelente",
      },
      {
        id: "escuchado",
        label: "¿Te sentiste escuchado(a) y atendido(a) durante el evento?",
        type: "choice",
        required: true,
        options: SI_NO,
      },
      {
        id: "mejoras",
        label: "¿Qué cosas te gustaría que mejoráramos para futuras ediciones?",
        type: "text",
        required: true,
        multiline: true,
      },
      {
        id: "loQueMasGusto",
        label: "¿Qué fue lo que más te gustó del evento?",
        type: "text",
        required: true,
        multiline: true,
      },
      {
        id: "dinamicaPropuesta",
        label: "¿Quisieras proponer alguna dinámica para una próxima edición? ¡Dinos cuál!",
        type: "text",
        required: false,
        multiline: true,
      },
    ],
  },
];

export function getSurveyTemplate(id: string): SurveyTemplate {
  return SURVEY_TEMPLATES.find((t) => t.id === id) ?? SURVEY_TEMPLATES[0];
}

/** Valores válidos de una escala: [1,2,3,4,5]. */
export function scaleValues(question: SurveyQuestion): number[] {
  const min = question.scaleMin ?? 1;
  const max = question.scaleMax ?? 5;
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}

/**
 * Valida las respuestas contra la plantilla. La usan el formulario y la
 * API, para que el navegador y el servidor apliquen la misma regla.
 */
export function validateSurveyAnswers(
  template: SurveyTemplate,
  answers: Record<string, string>
): { question: string; message: string } | null {
  for (const question of template.questions) {
    const value = (answers[question.id] ?? "").trim();

    if (question.required && !value) {
      return { question: question.id, message: `Falta contestar: "${question.label}"` };
    }
    if (!value) continue;

    if (question.type === "scale") {
      const allowed = scaleValues(question).map(String);
      if (!allowed.includes(value)) {
        return {
          question: question.id,
          message: `Elige una calificación válida en "${question.label}"`,
        };
      }
    }
    if (question.type === "choice" && !question.options?.includes(value)) {
      return {
        question: question.id,
        message: `Elige una opción válida en "${question.label}"`,
      };
    }
    if (question.type === "text" && value.length > 1500) {
      return {
        question: question.id,
        message: `Tu respuesta a "${question.label}" es demasiado larga.`,
      };
    }
  }
  return null;
}

/** Deja sólo las respuestas de preguntas que existen en la plantilla. */
export function cleanSurveyAnswers(
  template: SurveyTemplate,
  answers: Record<string, string>
): Record<string, string> {
  const clean: Record<string, string> = {};
  for (const question of template.questions) {
    const value = (answers[question.id] ?? "").trim();
    if (value) clean[question.id] = value;
  }
  return clean;
}

// ---------------------------------------------------------------------
// Resumen para el panel: lo que alimenta las gráficas
// ---------------------------------------------------------------------

export interface SurveyOptionCount {
  label: string;
  count: number;
  /** 0–100, sobre las respuestas que contestaron esta pregunta. */
  percent: number;
}

export interface SurveyQuestionSummary {
  question: SurveyQuestion;
  /** Cuántas personas contestaron esta pregunta. */
  answered: number;
  /** scale y choice: conteo por opción, en el orden de la escala/opciones. */
  counts: SurveyOptionCount[];
  /** scale: promedio, o null si nadie contestó. */
  average: number | null;
  /** text: las respuestas escritas, más nuevas primero. */
  texts: string[];
}

export function summarizeSurvey(
  template: SurveyTemplate,
  responses: { answers: Record<string, string>; created_at: string }[]
): SurveyQuestionSummary[] {
  return template.questions.map((question) => {
    const values = responses
      .map((r) => (r.answers?.[question.id] ?? "").trim())
      .filter(Boolean);

    const answered = values.length;

    if (question.type === "text") {
      return { question, answered, counts: [], average: null, texts: values };
    }

    const labels =
      question.type === "scale"
        ? scaleValues(question).map(String)
        : [...(question.options ?? [])];

    const counts = labels.map((label) => {
      const count = values.filter((v) => v === label).length;
      return {
        label,
        count,
        percent: answered > 0 ? Math.round((count / answered) * 100) : 0,
      };
    });

    const average =
      question.type === "scale" && answered > 0
        ? values.reduce((sum, v) => sum + Number(v), 0) / answered
        : null;

    return { question, answered, counts, average, texts: [] };
  });
}
