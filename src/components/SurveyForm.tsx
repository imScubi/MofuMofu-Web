"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Character } from "@/components/ui/Character";
import { HeartShape } from "@/components/ui/Decorations";
import {
  cleanSurveyAnswers,
  getSurveyTemplate,
  scaleValues,
  validateSurveyAnswers,
  type SurveyQuestion,
} from "@/lib/surveyTemplates";
import { formErrorBoxClass, inputClass } from "@/lib/formClasses";
import { formatEventDates } from "@/lib/formatDates";
import type { EventRow, SurveyRow } from "@/lib/types";

interface SurveyFormProps {
  survey: SurveyRow;
  event: EventRow;
}

export function SurveyForm({ survey, event }: SurveyFormProps) {
  const template = getSurveyTemplate(survey.template);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [error]);

  function setAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    setError(null);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const invalid = validateSurveyAnswers(template, answers);
    if (invalid) {
      setError(invalid.message);
      document
        .getElementById(`q-${invalid.question}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);
    setError(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
      const res = await fetch("/api/encuesta/responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          token: survey.public_token,
          answers: cleanSurveyAnswers(template, answers),
        }),
      });

      const raw = await res.text();
      let data: { message?: string; detail?: string; ok?: boolean } = {};
      try {
        data = JSON.parse(raw);
      } catch {
        data = {};
      }

      if (!res.ok) {
        const base = data.message || "No pudimos enviar tus respuestas.";
        const detail = data.detail || (!raw.trim().startsWith("{") ? raw.slice(0, 200) : "");
        setError(`${base}${detail ? ` (error ${res.status}: ${detail})` : ""}`);
        return;
      }

      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error && err.name === "AbortError"
          ? "El servidor tardó demasiado en responder. Revisa tu conexión e intenta de nuevo."
          : "Ocurrió un error de conexión. Intenta de nuevo."
      );
    } finally {
      clearTimeout(timeout);
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <Card className="mofu-confetti mx-auto max-w-lg p-6 text-center sm:p-8">
        <Character name="mofu" size={179} className="mx-auto" priority />
        <h2 className="mt-2 font-heading text-[26px] font-extrabold leading-[1.15] text-ink">
          ¡Gracias por tu tiempo!
        </h2>
        <p className="mt-2 text-[14.5px] leading-[1.6] text-ink-soft">
          Ya recibimos tus respuestas. Cada comentario nos ayuda a que la
          siguiente edición salga mejor.
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <Character name="mimirosa" size={101} />
          <Character name="hanzo" size={112} />
        </div>
        <Link href="/" className="mt-5 block">
          <Button variant="secondary" className="w-full">
            Ir al inicio
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 text-center">
        <Character name="nyxie" size={179} className="mx-auto" priority />
        <h1 className="mt-1 font-heading text-[27px] font-extrabold leading-[1.12] text-ink">
          {survey.title}
        </h1>
        <p className="mt-1.5 text-[14.5px] text-ink-soft">
          {event.name} · {formatEventDates(event.date_start, event.date_end)}
        </p>
      </div>

      {survey.intro && (
        <Card className="mofu-confetti relative p-5 sm:p-6">
          <HeartShape className="absolute right-4 top-4 h-6 w-6 opacity-70" />
          <p className="pr-8 text-[14.5px] leading-[1.65] text-ink-soft">{survey.intro}</p>
        </Card>
      )}

      <p className="mt-4 rounded-2xl bg-mint-100/70 px-4 py-3 text-[13.5px] leading-[1.55] text-ink-soft">
        Tus respuestas son <strong className="text-ink">anónimas</strong>: no te
        pedimos nombre ni teléfono, así que puedes ser completamente sincero(a).
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {template.questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            index={index + 1}
            question={question}
            value={answers[question.id] ?? ""}
            onChange={(value) => setAnswer(question.id, value)}
          />
        ))}

        {error && (
          <p ref={errorRef} role="alert" className={formErrorBoxClass}>
            {error}
          </p>
        )}

        <div className="flex items-center justify-center pt-1">
          <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? "Enviando..." : "Enviar mis respuestas"}
          </Button>
        </div>
      </form>

      <div className="mt-6 flex items-end justify-center gap-4 opacity-90">
        <Character name="mimirosa" size={106} />
        <Character name="hanzo" size={123} />
      </div>
    </div>
  );
}

function QuestionCard({
  index,
  question,
  value,
  onChange,
}: {
  index: number;
  question: SurveyQuestion;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Card id={`q-${question.id}`} className="p-5 sm:p-6">
      <div className="flex gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pink-50 font-mono text-[13px] text-pink-700">
          {index}
        </span>
        <p className="font-heading text-[16.5px] font-bold leading-[1.35] text-ink">
          {question.label}
          {question.required ? (
            <span className="text-pink-600"> *</span>
          ) : (
            <span className="ml-1.5 text-[13px] font-semibold text-ink-soft">
              (opcional)
            </span>
          )}
        </p>
      </div>

      <div className="mt-4">
        {question.type === "scale" && (
          <ScaleInput question={question} value={value} onChange={onChange} />
        )}

        {question.type === "choice" && (
          <div className="flex flex-wrap gap-2.5">
            {question.options?.map((option) => (
              <OptionButton
                key={option}
                label={option}
                selected={value === option}
                onSelect={() => onChange(option)}
              />
            ))}
          </div>
        )}

        {question.type === "text" && (
          <textarea
            className={inputClass}
            rows={question.multiline ? 3 : 2}
            maxLength={1500}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Escribe tu respuesta"
          />
        )}
      </div>
    </Card>
  );
}

/**
 * La escala se toca, no se escribe: botones grandes del 1 al 5 con los
 * extremos etiquetados, porque "1" y "5" solos no dicen cuál es el bueno.
 */
function ScaleInput({
  question,
  value,
  onChange,
}: {
  question: SurveyQuestion;
  value: string;
  onChange: (value: string) => void;
}) {
  const values = scaleValues(question);

  return (
    <div>
      <div className="flex gap-2">
        {values.map((n) => {
          const selected = value === String(n);
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(String(n))}
              aria-pressed={selected}
              aria-label={`${n}${
                n === values[0] && question.scaleMinLabel
                  ? ` — ${question.scaleMinLabel}`
                  : n === values[values.length - 1] && question.scaleMaxLabel
                    ? ` — ${question.scaleMaxLabel}`
                    : ""
              }`}
              className={`flex h-12 flex-1 items-center justify-center rounded-2xl border-2 font-heading text-[17px] font-bold transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pink-300/60 ${
                selected
                  ? "border-pink-600 bg-pink-500 text-white shadow-[0_2px_0_0_var(--color-pink-700)]"
                  : "border-pink-100 bg-white text-ink-soft hover:border-pink-300"
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
      {(question.scaleMinLabel || question.scaleMaxLabel) && (
        <div className="mt-1.5 flex justify-between text-[12.5px] font-semibold text-ink-soft">
          <span>
            {values[0]}: {question.scaleMinLabel}
          </span>
          <span>
            {values[values.length - 1]}: {question.scaleMaxLabel}
          </span>
        </div>
      )}
    </div>
  );
}

function OptionButton({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`min-h-[44px] rounded-full border-2 px-5 text-[15px] font-bold transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pink-300/60 ${
        selected
          ? "border-pink-600 bg-pink-500 text-white shadow-[0_2px_0_0_var(--color-pink-700)]"
          : "border-pink-100 bg-white text-ink-soft hover:border-pink-300"
      }`}
    >
      {label}
    </button>
  );
}
