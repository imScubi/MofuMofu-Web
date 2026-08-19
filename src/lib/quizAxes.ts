import type { CharacterId } from "@/lib/characters";

/**
 * Los cuatro ejes del test.
 *
 * Son al estilo MBTI: cuatro preguntas de fondo, cinco preguntas cada
 * una, y al final un código de cuatro letras. El código NO decide qué
 * personaje te toca — eso lo deciden los puntos de afinidad de cada
 * respuesta — pero sí describe cómo funcionas, y es lo que hace que dos
 * personas con el mismo personaje sientan resultados distintos.
 *
 * Que dos personajes compartan código no es un error: es exactamente
 * por qué se llevan bien.
 */

export type AxisId = "energia" | "decision" | "ritmo" | "mundo";

export interface AxisPole {
  /** La letra que va en el código. */
  letter: string;
  name: string;
  /** Cómo se lee en el resultado, en segunda persona. */
  blurb: string;
}

export interface Axis {
  id: AxisId;
  question: string;
  a: AxisPole;
  b: AxisPole;
}

export const AXES: Axis[] = [
  {
    id: "energia",
    question: "¿De dónde sacas energía?",
    a: {
      letter: "F",
      name: "Fiesta",
      blurb: "te cargas de gente: entre más voces alrededor, más despierto estás",
    },
    b: {
      letter: "R",
      name: "Refugio",
      blurb:
        "te cargas en silencio: puedes con el bullicio, pero necesitas tu rato a solas para volver a ser tú",
    },
  },
  {
    id: "decision",
    question: "¿Con qué decides?",
    a: {
      letter: "C",
      name: "Corazón",
      blurb: "decides por cómo se va a sentir la gente, y casi siempre le atinas",
    },
    b: {
      letter: "M",
      name: "Mente",
      blurb: "decides cuando ya entendiste el problema completo, no antes",
    },
  },
  {
    id: "ritmo",
    question: "¿A qué ritmo vas?",
    a: {
      letter: "V",
      name: "Vuelo",
      blurb: "te lanzas y lo resuelves en el aire, que es donde mejor piensas",
    },
    b: {
      letter: "P",
      name: "Plan",
      blurb: "primero lo armas en tu cabeza, y por eso te sale bien a la primera",
    },
  },
  {
    id: "mundo",
    question: "¿Qué te llena?",
    a: {
      letter: "G",
      name: "Gente",
      blurb: "lo tuyo son las personas: te acuerdas de sus nombres y de lo que les gusta",
    },
    b: {
      letter: "T",
      name: "Taller",
      blurb: "lo tuyo es hacer cosas: necesitas terminar el día con algo entre las manos",
    },
  },
];

export type AxisAnswers = Record<AxisId, "a" | "b">;

/** El código de cuatro letras, en el orden de los ejes. */
export function buildCode(answers: AxisAnswers): string {
  return AXES.map((axis) => axis[answers[axis.id]].letter).join("");
}

/**
 * El código de cada personaje.
 *
 * Salió bonito sin buscarlo: los que se llevan bien comparten casi
 * todas las letras. Hanzo y Kaini tienen el mismo código y son
 * inseparables; Mofu y Nori sólo cambian en la energía; Nyxie y Rakkun
 * sólo en si lo suyo es la gente o el taller. Por eso el resultado
 * puede decir "compartes energía con…" y ser verdad.
 */
export const CHARACTER_CODES: Record<CharacterId, string> = {
  mofu: "RCPG",
  nori: "FCPG",
  nyxie: "RMPG",
  rakkun: "RMPT",
  mimirosa: "RCPT",
  charmy: "FCVT",
  hanzo: "FCVG",
  kaini: "FCVG",
};
