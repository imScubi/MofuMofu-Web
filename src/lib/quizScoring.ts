import { CHARACTER_IDS, type CharacterId } from "@/lib/characters";
import {
  AXES,
  CHARACTER_CODES,
  buildCode,
  type AxisAnswers,
  type AxisId,
} from "@/lib/quizAxes";
import {
  PRIMARY_POINTS,
  QUESTIONS,
  SECONDARY_POINTS,
} from "@/lib/quizQuestions";

/** Respuestas: por cada id de pregunta, el índice de la opción elegida. */
export type QuizAnswers = Record<number, number>;

export interface QuizOutcome {
  character: CharacterId;
  /** El de segundo lugar: es con quien "también te pareces". */
  runnerUp: CharacterId;
  code: string;
  axes: AxisAnswers;
  scores: Record<CharacterId, number>;
  /** Qué tan marcado salió cada eje, de 50 a 100. */
  axisStrength: Record<AxisId, number>;
  /** Otros del elenco con tu mismo código. */
  sameCode: CharacterId[];
}

export function isComplete(answers: QuizAnswers): boolean {
  return QUESTIONS.every((q) => typeof answers[q.id] === "number");
}

/**
 * Cuenta los puntos y devuelve el resultado.
 *
 * Los empates se rompen con el código: si dos personajes quedan igual,
 * gana el que más se parezca a cómo contestaste en los cuatro ejes. Y
 * si aun así empatan, decide el orden del elenco — nunca al azar, para
 * que contestar lo mismo dé siempre el mismo resultado.
 */
export function scoreQuiz(answers: QuizAnswers): QuizOutcome {
  const scores = Object.fromEntries(CHARACTER_IDS.map((id) => [id, 0])) as Record<
    CharacterId,
    number
  >;

  const poleCounts: Record<AxisId, { a: number; b: number }> = {
    energia: { a: 0, b: 0 },
    decision: { a: 0, b: 0 },
    ritmo: { a: 0, b: 0 },
    mundo: { a: 0, b: 0 },
  };

  for (const question of QUESTIONS) {
    const option = question.options[answers[question.id]];
    if (!option) continue;
    scores[option.primary] += PRIMARY_POINTS;
    scores[option.secondary] += SECONDARY_POINTS;
    poleCounts[question.axis][option.pole] += 1;
  }

  const axes = {} as AxisAnswers;
  const axisStrength = {} as Record<AxisId, number>;
  for (const axis of AXES) {
    const { a, b } = poleCounts[axis.id];
    const total = a + b || 1;
    axes[axis.id] = a >= b ? "a" : "b";
    axisStrength[axis.id] = Math.round((Math.max(a, b) / total) * 100);
  }

  const code = buildCode(axes);

  // Cuántas letras comparte cada personaje con el código de quien
  // contestó: es el desempate y también sirve para el "te pareces a".
  const codeMatch = (id: CharacterId) =>
    CHARACTER_CODES[id].split("").filter((letter, i) => letter === code[i]).length;

  const ranked = [...CHARACTER_IDS].sort((x, y) => {
    if (scores[y] !== scores[x]) return scores[y] - scores[x];
    if (codeMatch(y) !== codeMatch(x)) return codeMatch(y) - codeMatch(x);
    return CHARACTER_IDS.indexOf(x) - CHARACTER_IDS.indexOf(y);
  });

  return {
    character: ranked[0],
    runnerUp: ranked[1],
    code,
    axes,
    scores,
    axisStrength,
    sameCode: CHARACTER_IDS.filter(
      (id) => id !== ranked[0] && CHARACTER_CODES[id] === code
    ),
  };
}
