"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Character, type CharacterName } from "@/components/ui/Character";
import { Checkbox } from "@/components/ui/Checkbox";
import { ContestRegulation } from "@/components/ContestRegulation";
import {
  cleanAnswers,
  getContestType,
  isFieldVisible,
  spotifyTrackId,
  validateAnswers,
  type ContestField,
} from "@/lib/contestTypes";
import { contestAvailability } from "@/lib/contestStatus";
import {
  formErrorBoxClass,
  helpClass,
  inputClass,
  labelClass,
} from "@/lib/formClasses";
import { eventVenue } from "@/lib/eventConfig";
import { formatDate, formatEventDates } from "@/lib/formatDates";
import type { ContestRow, EventRow } from "@/lib/types";

interface ContestFormProps {
  contest: ContestRow;
  event: EventRow;
}

// Igual que el registro de expositores: nada de `required` nativo. Un
// campo condicionado que se oculta con la condición apagada haría que el
// navegador bloqueara el envío sin decir por qué.

// Cada convocatoria tiene su anfitrión, y no al azar: Kaini vive para
// las coreografías, a Hanzo lo atrapó el anime en cuanto llegó, y
// Rakkun es el del TCG. Mofu recibe lo demás, como en todo.
const HOST_BY_TYPE: Record<string, CharacterName> = {
  dance_cover: "kaini",
  cosplay: "hanzo",
  tcg: "rakkun",
  otro: "mofu",
};

export function ContestForm({ contest, event }: ContestFormProps) {
  const type = getContestType(contest.type);
  const host = HOST_BY_TYPE[type.id] ?? "mofu";
  const availability = contestAvailability(contest);

  const [participantName, setParticipantName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    // Los selects arrancan en su primera opción para que nadie mande el
    // formulario con un valor vacío que no eligió.
    const initial: Record<string, string> = {};
    for (const field of type.fields) {
      if (field.type === "select" && field.required && field.options?.length) {
        initial[field.id] = field.options[0];
      }
    }
    return initial;
  });

  const [reglamentoAccepted, setReglamentoAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [folio, setFolio] = useState<number | null>(null);

  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [error]);

  function setAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!participantName.trim()) {
      setError(`Completa "${type.nameLabel}".`);
      return;
    }
    if (!phone.trim()) {
      setError("Necesitamos un número de contacto.");
      return;
    }
    const invalid = validateAnswers(type, answers);
    if (invalid) {
      setError(invalid.message);
      return;
    }
    if (!reglamentoAccepted) {
      setError("Debes leer y aceptar el reglamento para inscribirte.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
      const res = await fetch("/api/convocatorias/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contestId: contest.id,
          participantName: participantName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          answers: cleanAnswers(type, answers),
          reglamentoAccepted,
        }),
      });

      const raw = await res.text();
      let data: { message?: string; detail?: string; folio_number?: number } = {};
      try {
        data = JSON.parse(raw);
      } catch {
        data = {};
      }

      if (!res.ok) {
        const base = data.message || "No pudimos completar tu inscripción.";
        const detail = data.detail || (!raw.trim().startsWith("{") ? raw.slice(0, 200) : "");
        setError(`${base}${detail ? ` (error ${res.status}: ${detail})` : ""}`);
        return;
      }

      if (typeof data.folio_number !== "number") {
        setError(
          "Tu inscripción se envió pero el servidor no devolvió folio. Escríbenos antes de intentar de nuevo para no duplicar tu lugar."
        );
        return;
      }

      setFolio(data.folio_number);
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

  if (folio != null) {
    return (
      <Card className="mofu-confetti mx-auto max-w-lg p-6 text-center sm:p-8">
        <Character name={host} size={185} className="mx-auto" priority />
        <h2 className="mt-1 font-heading text-[26px] font-extrabold leading-[1.15] text-ink">
          ¡Quedaste inscrito!
        </h2>
        <p className="mt-2 text-[14.5px] leading-[1.6] text-ink-soft">
          {contest.name} · {event.name}
        </p>
        <div className="mofu-ticket mt-5 rounded-[22px] border-2 border-dashed border-pink-300 bg-white px-4 py-5">
          <p className="text-[11.5px] font-extrabold uppercase tracking-[0.14em] text-pink-700">
            Guarda tu folio
          </p>
          <p className="mt-1.5 font-mono text-[40px] font-medium leading-none tracking-[0.06em] text-pink-700">
            #{folio}
          </p>
          <p className="mt-2.5 text-[13px] font-semibold leading-[1.5] text-ink-soft">
            Toma captura. Te vamos a escribir por WhatsApp con los detalles y el
            horario de tu participación.
          </p>
        </div>
        <Link href="/convocatorias" className="mt-5 block">
          <Button variant="secondary" className="w-full">
            Ver otras convocatorias
          </Button>
        </Link>
        <Link href="/" className="mt-2 block">
          <Button variant="ghost" className="w-full">
            Volver al inicio
          </Button>
        </Link>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11.5px] font-extrabold uppercase tracking-[0.12em] text-pink-700">
              {type.label}
            </p>
            <h1 className="mt-1 font-heading text-[26px] font-extrabold leading-[1.15] text-ink">
              {contest.name}
            </h1>
            <p className="mt-1.5 text-[14.5px] leading-[1.6] text-ink-soft">
              {event.name} · {formatEventDates(event.date_start, event.date_end)}
              {eventVenue(event).line ? ` · ${eventVenue(event).line}` : ""}
            </p>
          </div>
          <Character name={host} size={129} className="shrink-0" priority />
        </div>
        {contest.description && (
          <p className="mt-3 rounded-2xl bg-lavender-100/60 px-4 py-3 text-[14px] leading-[1.55] text-ink-soft">
            {contest.description}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {availability.spotsLeft != null && (
            <span
              className={`rounded-full px-3 py-1 text-[12.5px] font-bold ${
                availability.spotsLeft > 0
                  ? "bg-mint-100 text-mint-500"
                  : "bg-danger-50 text-danger-600"
              }`}
            >
              {availability.spotsLeft > 0
                ? `Quedan ${availability.spotsLeft} de ${contest.max_entries} lugares`
                : "Cupo lleno"}
            </span>
          )}
          {contest.registration_deadline && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-[12.5px] font-bold text-amber-500">
              Cierra el {formatDate(contest.registration_deadline)}
            </span>
          )}
        </div>

        {!availability.open ? (
          <div className="mt-6 rounded-2xl bg-danger-50 px-4 py-4 text-center">
            <p className="font-heading text-lg font-bold text-danger-600">
              {availability.closedReason}
            </p>
            <p className="mt-1 text-[13.5px] text-ink-soft">
              Si crees que es un error, escríbenos y lo revisamos.
            </p>
            <Link href="/convocatorias" className="mt-4 block">
              <Button variant="secondary" className="w-full">
                Ver otras convocatorias
              </Button>
            </Link>
          </div>
        ) : (
          // El error se limpia al primer cambio: dejarlo puesto mientras
          // ya corrigieron el campo hace creer que sigue mal.
          <form
            onSubmit={handleSubmit}
            onChange={() => error && setError(null)}
            className="mt-6 space-y-5"
          >
            <div>
              <label className={labelClass} htmlFor="participantName">
                {type.nameLabel}
                <span className="text-pink-600"> *</span>
              </label>
              <input
                id="participantName"
                className={inputClass}
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                placeholder={type.namePlaceholder}
                maxLength={200}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="phone">
                  Teléfono / WhatsApp<span className="text-pink-600"> *</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  className={inputClass}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={30}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="email">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  type="email"
                  className={inputClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={200}
                />
              </div>
            </div>

            {type.fields.map((field) =>
              isFieldVisible(field, answers) ? (
                <ContestFieldInput
                  key={field.id}
                  field={field}
                  value={answers[field.id] ?? ""}
                  onChange={(value) => setAnswer(field.id, value)}
                />
              ) : null
            )}

            {/* El reglamento va dentro del formulario, no en un link que
                nadie abre: es lo que respalda una descalificación o un
                "no hay reembolso" el día del evento. */}
            <div className="rounded-2xl border-2 border-lavender-300 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-heading text-base font-bold text-ink">
                  Reglamento del concurso
                </h2>
                <Link
                  href={`/convocatorias/${contest.id}/reglamento`}
                  target="_blank"
                  className="text-[13px] font-bold text-pink-700 underline underline-offset-2"
                >
                  Abrir en otra pestaña ↗
                </Link>
              </div>
              <div className="mofu-scroll mt-3 max-h-[320px] overflow-y-auto rounded-2xl bg-cream/60 p-4">
                <ContestRegulation contest={contest} event={event} />
              </div>
              <div className="mt-3">
                <Checkbox
                  checked={reglamentoAccepted}
                  onChange={(e) => setReglamentoAccepted(e.target.checked)}
                >
                  Leí y acepto el reglamento completo de este concurso.
                </Checkbox>
              </div>
            </div>

            {error && (
              <p ref={errorRef} role="alert" className={formErrorBoxClass}>
                {error}
              </p>
            )}

            <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
              <Link href="/convocatorias">
                <Button type="button" variant="ghost">
                  ← Atrás
                </Button>
              </Link>
              <Button type="submit" size="lg" disabled={submitting}>
                {submitting ? "Enviando..." : "Enviar mi inscripción"}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}

function ContestFieldInput({
  field,
  value,
  onChange,
}: {
  field: ContestField;
  value: string;
  onChange: (value: string) => void;
}) {
  const label = (
    <label className={labelClass} htmlFor={field.id}>
      {field.label}
      {field.required && <span className="text-pink-600"> *</span>}
    </label>
  );

  const help = field.help ? <p className={helpClass}>{field.help}</p> : null;

  if (field.type === "select") {
    return (
      <div>
        {label}
        <select
          id={field.id}
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {!field.required && <option value="">Sin especificar</option>}
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {help}
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div>
        {label}
        <textarea
          id={field.id}
          className={inputClass}
          rows={3}
          maxLength={field.maxLength ?? 600}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
        />
        {help}
      </div>
    );
  }

  if (field.type === "song") {
    const trackId = spotifyTrackId(value);
    return (
      <div>
        {label}
        <input
          id={field.id}
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Link de Spotify o YouTube, o el nombre de la canción"
          maxLength={400}
        />
        {help}
        {/* Al pegar un link de Spotify aparece la canción: así quien se
            inscribe confirma que mandó la correcta, sin que tengamos que
            pedir credenciales de la API de Spotify. */}
        {trackId && (
          <iframe
            title="Vista previa de la canción"
            src={`https://open.spotify.com/embed/track/${trackId}`}
            className="mt-2 h-[80px] w-full rounded-2xl border-0"
            loading="lazy"
            allow="encrypted-media"
          />
        )}
      </div>
    );
  }

  return (
    <div>
      {label}
      <input
        id={field.id}
        type={field.type === "number" ? "number" : "text"}
        inputMode={field.type === "number" ? "numeric" : undefined}
        min={field.type === "number" ? 1 : undefined}
        className={inputClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        maxLength={field.type === "number" ? undefined : (field.maxLength ?? 200)}
      />
      {help}
    </div>
  );
}
