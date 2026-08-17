"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SurveyResults } from "@/components/admin/SurveyResults";
import { getSurveyTemplate, SURVEY_TEMPLATES } from "@/lib/surveyTemplates";
import { formErrorBoxClass, inputClass, labelClass } from "@/lib/formClasses";
import { formatEventDates } from "@/lib/formatDates";
import type { EventRow, SurveyResponseRow, SurveyRow } from "@/lib/types";

interface SurveysAdminProps {
  events: EventRow[];
  selectedEvent: EventRow;
  initialSurveys: SurveyRow[];
  initialResponses: SurveyResponseRow[];
}

export function SurveysAdmin({
  events,
  selectedEvent,
  initialSurveys,
  initialResponses,
}: SurveysAdminProps) {
  const router = useRouter();

  const [surveys, setSurveys] = useState(initialSurveys);
  const [responses, setResponses] = useState(initialResponses);

  const [syncedSurveys, setSyncedSurveys] = useState(initialSurveys);
  const [syncedResponses, setSyncedResponses] = useState(initialResponses);
  if (initialSurveys !== syncedSurveys) {
    setSyncedSurveys(initialSurveys);
    setSurveys(initialSurveys);
  }
  if (initialResponses !== syncedResponses) {
    setSyncedResponses(initialResponses);
    setResponses(initialResponses);
  }

  const [template, setTemplate] = useState(SURVEY_TEMPLATES[0].id);
  const [title, setTitle] = useState(SURVEY_TEMPLATES[0].defaultTitle);
  const [intro, setIntro] = useState(SURVEY_TEMPLATES[0].defaultIntro);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);
  // Sólo una encuesta abierta a la vez: dos tableros de resultados en
  // pantalla compiten entre sí y ninguno se lee.
  const [openSurveyId, setOpenSurveyId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function handleTemplateChange(nextId: string) {
    const previous = getSurveyTemplate(template);
    const next = getSurveyTemplate(nextId);
    setTemplate(nextId);
    if (!title.trim() || title === previous.defaultTitle) setTitle(next.defaultTitle);
    if (!intro.trim() || intro === previous.defaultIntro) setIntro(next.defaultIntro);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Ponle un título a la encuesta.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedEvent.id,
          template,
          title: title.trim(),
          intro: intro.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "No pudimos crear la encuesta.");
        return;
      }
      setSurveys((prev) => [...prev, data as SurveyRow]);
      router.refresh();
    } catch {
      setError("Ocurrió un error de conexión. Intenta de nuevo.");
    } finally {
      setCreating(false);
    }
  }

  async function patchSurvey(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/surveys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      if (res.ok) {
        const updated = (await res.json()) as SurveyRow;
        setSurveys((prev) => prev.map((s) => (s.id === id ? updated : s)));
      }
    } finally {
      setBusyId(null);
    }
  }

  async function deleteSurvey(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/surveys?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "No pudimos borrar la encuesta.");
        return;
      }
      setSurveys((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setBusyId(null);
      setConfirmDeleteId(null);
    }
  }

  function surveyUrl(survey: SurveyRow) {
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    return `${origin}/encuesta/${survey.public_token}`;
  }

  async function copyLink(survey: SurveyRow) {
    try {
      await navigator.clipboard.writeText(surveyUrl(survey));
      setCopiedId(survey.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      // Si el navegador bloquea el portapapeles, el link sigue visible.
    }
  }

  return (
    <div className="mx-auto max-w-[1000px]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">
            Encuestas de retroalimentación
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {selectedEvent.name} ·{" "}
            {formatEventDates(selectedEvent.date_start, selectedEvent.date_end)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {events.length > 1 && (
            <select
              value={selectedEvent.id}
              onChange={(e) =>
                router.push(`/admin/dashboard/encuestas?event=${e.target.value}`)
              }
              className="min-h-[44px] rounded-full border-2 border-pink-100 bg-white px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-pink-300 focus:border-pink-500 focus:outline-none focus:ring-4 focus:ring-pink-100"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
          )}
          <Link href="/admin/dashboard">
            <Button variant="ghost">← Volver a expositores</Button>
          </Link>
        </div>
      </div>

      {surveys.length === 0 ? (
        <Card className="mt-6 p-6">
          <h2 className="font-heading text-lg font-bold text-ink">Nueva encuesta</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Se crea con las preguntas de la plantilla. Al terminar te damos un link
            independiente para compartirlo con tus expositores.
          </p>
          <CreateForm
            template={template}
            title={title}
            intro={intro}
            creating={creating}
            error={error}
            onTemplateChange={handleTemplateChange}
            onTitleChange={setTitle}
            onIntroChange={setIntro}
            onSubmit={handleCreate}
          />
        </Card>
      ) : (
        <details className="group mt-6">
          <summary className="cursor-pointer list-none rounded-full bg-pink-50 px-5 py-3 font-heading text-sm font-bold text-pink-700 transition-colors hover:bg-pink-100">
            + Crear otra encuesta para esta edición
          </summary>
          <Card className="mt-3 p-6">
            <CreateForm
              template={template}
              title={title}
              intro={intro}
              creating={creating}
              error={error}
              onTemplateChange={handleTemplateChange}
              onTitleChange={setTitle}
              onIntroChange={setIntro}
              onSubmit={handleCreate}
            />
          </Card>
        </details>
      )}

      <div className="mt-6 space-y-4">
        {surveys.map((survey) => {
          const surveyTemplate = getSurveyTemplate(survey.template);
          const surveyResponses = responses.filter((r) => r.survey_id === survey.id);
          const expanded = openSurveyId === survey.id;

          return (
            <Card key={survey.id} className="overflow-hidden p-0">
              <div className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-pink-700">
                      {surveyTemplate.label}
                    </p>
                    <h3 className="font-heading text-lg font-bold text-ink">
                      {survey.title}
                    </h3>
                    <p className="mt-0.5 text-sm text-ink-soft">
                      {survey.responses_count}{" "}
                      {survey.responses_count === 1 ? "respuesta" : "respuestas"} ·{" "}
                      {surveyTemplate.questions.length} preguntas
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      survey.is_open
                        ? "bg-mint-100 text-mint-500"
                        : "bg-gray-100 text-ink-soft"
                    }`}
                  >
                    {survey.is_open ? "Recibiendo respuestas" : "Cerrada"}
                  </span>
                </div>

                {/* El link es lo que el admin viene a buscar: va completo
                    y con un botón de copiar de 44px. */}
                <div className="mt-4 rounded-2xl bg-lavender-100/60 p-3">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-lavender-500">
                    Link para compartir
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-ink">
                      /encuesta/{survey.public_token}
                    </code>
                    <Button
                      variant="secondary"
                      onClick={() => copyLink(survey)}
                      className="!px-4 !py-1.5 text-xs"
                    >
                      {copiedId === survey.id ? "¡Copiado!" : "Copiar link"}
                    </Button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    disabled={busyId === survey.id}
                    onClick={() => patchSurvey(survey.id, { isOpen: !survey.is_open })}
                    className="!px-4 !py-1.5 text-xs"
                  >
                    {survey.is_open ? "Cerrar encuesta" : "Reabrir encuesta"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setOpenSurveyId(expanded ? null : survey.id)}
                    className="!px-4 !py-1.5 text-xs"
                  >
                    {expanded
                      ? "Ocultar resultados"
                      : `Ver resultados (${surveyResponses.length})`}
                  </Button>
                  <Link href={`/encuesta/${survey.public_token}`} target="_blank">
                    <Button variant="ghost" className="!px-4 !py-1.5 text-xs">
                      Abrir encuesta ↗
                    </Button>
                  </Link>

                  <div className="ml-auto">
                    {confirmDeleteId === survey.id ? (
                      <div className="flex items-center gap-2 rounded-xl bg-danger-50 px-2 py-1.5">
                        <span className="text-[11px] font-bold text-danger-600">
                          ¿Borrar la encuesta?
                        </span>
                        <Button
                          variant="danger"
                          disabled={busyId === survey.id}
                          onClick={() => deleteSurvey(survey.id)}
                          className="!px-3 !py-1 text-xs"
                        >
                          Sí
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => setConfirmDeleteId(null)}
                          className="!px-3 !py-1 text-xs"
                        >
                          No
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        onClick={() => setConfirmDeleteId(survey.id)}
                        className="!px-4 !py-1.5 text-xs !text-danger-600"
                      >
                        Borrar
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {expanded && (
                <div className="border-t border-pink-100 bg-cream/40">
                  <SurveyResults
                    template={surveyTemplate}
                    responses={surveyResponses}
                  />
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function CreateForm({
  template,
  title,
  intro,
  creating,
  error,
  onTemplateChange,
  onTitleChange,
  onIntroChange,
  onSubmit,
}: {
  template: string;
  title: string;
  intro: string;
  creating: boolean;
  error: string | null;
  onTemplateChange: (id: string) => void;
  onTitleChange: (value: string) => void;
  onIntroChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
}) {
  const selected = getSurveyTemplate(template);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>Plantilla de preguntas</label>
        <select
          className={inputClass}
          value={template}
          onChange={(e) => onTemplateChange(e.target.value)}
        >
          {SURVEY_TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <ol className="mt-2 space-y-1 text-[13px] text-ink-soft">
          {selected.questions.map((q, i) => (
            <li key={q.id}>
              {i + 1}. {q.label}
            </li>
          ))}
        </ol>
      </div>

      <div>
        <label className={labelClass}>Título</label>
        <input
          className={inputClass}
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
        />
      </div>

      <div>
        <label className={labelClass}>Mensaje de bienvenida</label>
        <textarea
          className={inputClass}
          rows={5}
          maxLength={1200}
          value={intro}
          onChange={(e) => onIntroChange(e.target.value)}
        />
      </div>

      {error && <p className={formErrorBoxClass}>{error}</p>}

      <Button type="submit" disabled={creating}>
        {creating ? "Creando..." : "Crear encuesta y generar link"}
      </Button>
    </form>
  );
}
