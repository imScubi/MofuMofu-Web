"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Character } from "@/components/ui/Character";
import { FlowerShape } from "@/components/ui/Decorations";
import { CharacterPortrait } from "@/components/CharacterPortrait";
import { QuizResultCard } from "@/components/QuizResultCard";
import { CHARACTERS } from "@/lib/characters";
import { QUESTIONS } from "@/lib/quizQuestions";
import { scoreQuiz, type QuizAnswers, type QuizOutcome } from "@/lib/quizScoring";

/**
 * El test de 20 preguntas.
 *
 * Una pregunta a la vez y avance automático al elegir: en el celular,
 * que es donde se va a contestar, una lista de veinte preguntas con
 * scroll se abandona a la mitad.
 */
export function PersonalityQuiz() {
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [index, setIndex] = useState(0);
  const [outcome, setOutcome] = useState<QuizOutcome | null>(null);
  const [tally, setTally] = useState<{ total: number; counts: Record<string, number> } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const question = QUESTIONS[index];
  const answered = Object.keys(answers).length;
  const progress = Math.round((answered / QUESTIONS.length) * 100);

  // El foco viaja con la pregunta: sin esto, quien navega con teclado o
  // lector de pantalla se queda anclado en la respuesta que ya eligió.
  useEffect(() => {
    headingRef.current?.focus();
  }, [index, outcome]);

  function choose(optionIndex: number) {
    const next = { ...answers, [question.id]: optionIndex };
    setAnswers(next);

    if (index + 1 < QUESTIONS.length) {
      setIndex(index + 1);
      return;
    }

    const result = scoreQuiz(next);
    setOutcome(result);

    // El conteo es parte del resultado ("eres del 9%"), pero si falla no
    // se le arruina el test a nadie.
    fetch("/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ character: result.character, code: result.code }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setTally(data))
      .catch(() => {});
  }

  function restart() {
    setAnswers({});
    setIndex(0);
    setOutcome(null);
    setTally(null);
  }

  const share = useMemo(() => {
    if (!outcome) return null;
    return { character: outcome.character, code: outcome.code };
  }, [outcome]);

  if (outcome && share) {
    return (
      <QuizResultCard
        outcome={outcome}
        tally={tally}
        onRestart={restart}
        headingRef={headingRef}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* El encabezado vive aquí y no en la página por dos razones: se
          quita al terminar (dejar "¿qué personaje eres?" encima de la
          respuesta se lee como si el test siguiera), y se encoge en
          cuanto contestas la primera — en un celular, la presentación
          completa empuja la pregunta debajo del pliegue en cada paso. */}
      {answered === 0 ? (
        <div className="mb-8 text-center">
          <Character name="mofu" size={146} className="mx-auto" priority />
          <FlowerShape className="mx-auto mt-1 h-8 w-8" />
          <h1 className="mt-2 font-heading text-[27px] font-bold leading-tight text-ink sm:text-4xl">
            ¿Qué personaje de MofuMofu eres?
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-[15px] text-ink-soft sm:text-base">
            Ocho habitantes de PuffiLand cayeron aquí por un portal que Nyxie
            abrió sin querer. Veinte preguntas y sabemos a cuál te pareces.
          </p>
        </div>
      ) : (
        <h1 className="mb-4 text-center font-heading text-lg font-bold text-ink">
          ¿Qué personaje de MofuMofu eres?
        </h1>
      )}

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-pink-700">
          Pregunta {index + 1} de {QUESTIONS.length}
        </span>
        <span className="text-sm text-ink-soft">{progress}%</span>
      </div>
      <div
        className="mt-2 h-2.5 overflow-hidden rounded-full bg-pink-100"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Avance del test"
      >
        <div
          className="h-full rounded-full bg-pink-500 transition-all duration-300"
          style={{ width: `${Math.max(progress, 3)}%` }}
        />
      </div>

      <Card className="mt-5 p-6 sm:p-7">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="font-heading text-xl font-bold text-ink outline-none sm:text-2xl"
        >
          {question.text}
        </h2>

        <div className="mt-5 grid gap-3">
          {question.options.map((option, i) => (
            <button
              key={i}
              type="button"
              onClick={() => choose(i)}
              className="rounded-2xl border-2 border-pink-100 bg-white px-4 py-3.5 text-left text-[15px] font-semibold text-ink transition-colors hover:border-pink-300 hover:bg-pink-50 focus-visible:border-pink-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pink-100"
            >
              {option.text}
            </button>
          ))}
        </div>

        {index > 0 && (
          <button
            type="button"
            onClick={() => setIndex(index - 1)}
            className="mt-5 text-sm font-semibold text-ink-soft underline underline-offset-2 hover:text-pink-700"
          >
            ← Volver a la anterior
          </button>
        )}
      </Card>

      {/* El elenco a la vista mientras contestas: da curiosidad por
          saber cuál te va a tocar, y de paso los presenta. */}
      <div className="mt-7 text-center">
        <p className="text-sm font-semibold text-ink-soft">
          Ocho personajes. Uno es tuyo.
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-center gap-2">
          {Object.values(CHARACTERS).map((character) => (
            <CharacterPortrait
              key={character.id}
              id={character.id}
              size={64}
              className="opacity-45 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0"
            />
          ))}
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-ink-soft">
        Es un test para divertirse, no un diagnóstico.{" "}
        <Link href="/" className="underline underline-offset-2">
          Volver al inicio
        </Link>
      </p>
    </div>
  );
}
