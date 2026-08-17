"use client";

import { Card } from "@/components/ui/Card";
import {
  summarizeSurvey,
  type SurveyQuestionSummary,
  type SurveyTemplate,
} from "@/lib/surveyTemplates";
import type { SurveyResponseRow } from "@/lib/types";

/**
 * Resultados de una encuesta.
 *
 * Cada pregunta cerrada es una sola serie (cuántas personas eligieron
 * cada opción), así que las barras van todas del mismo rosa: no hay
 * identidades que distinguir, sólo magnitudes que comparar. Por eso
 * tampoco hay leyenda — el título de la pregunta ya dice qué se grafica.
 */
export function SurveyResults({
  template,
  responses,
}: {
  template: SurveyTemplate;
  responses: SurveyResponseRow[];
}) {
  const summary = summarizeSurvey(template, responses);

  if (responses.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-sm text-ink-soft">
        Todavía nadie contesta esta encuesta. Comparte el link y aquí van a
        aparecer las gráficas.
      </p>
    );
  }

  const scaleQuestions = summary.filter(
    (s) => s.question.type === "scale" && s.average != null
  );

  return (
    <div className="space-y-5 p-5">
      {/* La cifra con la que se lee todo lo demás. */}
      <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <div>
          <p className="text-xs font-semibold text-ink-soft">Respuestas recibidas</p>
          <p className="font-heading text-[48px] font-extrabold leading-none text-ink">
            {responses.length}
          </p>
        </div>
        {scaleQuestions.map((s) => (
          <div key={s.question.id}>
            <p className="max-w-[190px] text-xs font-semibold leading-tight text-ink-soft">
              {shortLabel(s.question.label)}
            </p>
            <p className="mt-1 font-heading text-2xl font-bold text-ink">
              {s.average!.toFixed(1)}
              <span className="ml-1 text-sm font-bold text-ink-soft">
                / {s.question.scaleMax ?? 5}
              </span>
            </p>
          </div>
        ))}
      </div>

      {summary.map((item, index) => (
        <QuestionResult key={item.question.id} index={index + 1} item={item} />
      ))}
    </div>
  );
}

function QuestionResult({
  index,
  item,
}: {
  index: number;
  item: SurveyQuestionSummary;
}) {
  const { question, answered, counts, average, texts } = item;

  return (
    <Card className="p-5">
      <div className="flex gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pink-50 font-mono text-[13px] text-pink-700">
          {index}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-heading text-[15.5px] font-bold leading-[1.35] text-ink">
            {question.label}
          </p>
          <p className="mt-0.5 text-xs text-ink-soft">
            {answered} {answered === 1 ? "respuesta" : "respuestas"}
            {average != null && ` · promedio ${average.toFixed(2)}`}
          </p>
        </div>
      </div>

      {question.type === "text" ? (
        <div className="mt-3 max-h-[320px] space-y-2 overflow-y-auto pr-1">
          {texts.length === 0 ? (
            <p className="text-sm text-ink-soft">Nadie contestó esta pregunta.</p>
          ) : (
            texts.map((text, i) => (
              <p
                key={i}
                className="rounded-2xl bg-cream px-3.5 py-2.5 text-[13.5px] leading-[1.55] text-ink"
              >
                {text}
              </p>
            ))
          )}
        </div>
      ) : (
        <BarChart counts={counts} scale={question.type === "scale"} />
      )}
    </Card>
  );
}

/**
 * Barras horizontales: la etiqueta a la izquierda, la barra creciendo
 * desde una sola línea base y el número al final. Con cinco valores como
 * mucho, etiquetar cada barra sí se lee — y así la gráfica no depende de
 * que alguien mida a ojo.
 *
 * El largo es el porcentaje sobre quienes contestaron, no sobre la barra
 * más alta: comparar entre barras da igual en ambos casos, pero así el
 * largo significa algo por sí solo y una barra llena quiere decir "todos".
 */
function BarChart({
  counts,
  scale,
}: {
  counts: { label: string; count: number; percent: number }[];
  scale: boolean;
}) {
  return (
    <div className="mt-3 space-y-2">
      {counts.map((c) => (
        <div
          key={c.label}
          className="flex items-center gap-3"
          title={`${c.label}: ${c.count} ${c.count === 1 ? "respuesta" : "respuestas"} (${c.percent}%)`}
        >
          <span
            className={`shrink-0 text-right text-[13px] font-bold text-ink ${
              scale ? "w-4 tabular-nums" : "w-[104px] truncate"
            }`}
          >
            {c.label}
          </span>

          <div className="h-5 flex-1 overflow-hidden rounded-r-[4px] bg-pink-50">
            <div
              className="h-full rounded-r-[4px] bg-pink-500"
              style={{ width: `${c.percent}%` }}
            />
          </div>

          <span className="w-[74px] shrink-0 text-[12.5px] font-semibold tabular-nums text-ink-soft">
            {c.count} · {c.percent}%
          </span>
        </div>
      ))}
    </div>
  );
}

/** Recorta la pregunta para que quepa arriba del número. */
function shortLabel(label: string): string {
  return label
    .replace(/^¿Cómo calificarías\s*/i, "")
    .replace(/\?$/, "")
    .replace(/^tu /i, "")
    .replace(/^la /i, "");
}
