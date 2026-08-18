"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CONTEST_TYPES, getContestType, type ContestTypeId } from "@/lib/contestTypes";
import { contestAvailability } from "@/lib/contestStatus";
import { InlineEdit } from "@/components/admin/InlineEdit";
import { PrizeEditor } from "@/components/admin/PrizeEditor";
import { formatDayLong } from "@/lib/eventDays";
import { formErrorBoxClass, inputClass, labelClass } from "@/lib/formClasses";
import { formatDate, formatEventDates } from "@/lib/formatDates";
import type {
  ContestEntryRow,
  ContestEntryStatus,
  ContestRow,
  EventRow,
} from "@/lib/types";

interface ContestsAdminProps {
  events: EventRow[];
  selectedEvent: EventRow;
  initialContests: ContestRow[];
  initialEntries: ContestEntryRow[];
}

const STATUS_LABEL: Record<ContestEntryStatus, string> = {
  pending_review: "En revisión",
  approved: "Aceptado",
  rejected: "Rechazado",
};

const STATUS_BADGE: Record<ContestEntryStatus, string> = {
  pending_review: "bg-amber-100 text-amber-500",
  approved: "bg-mint-100 text-mint-500",
  rejected: "bg-danger-50 text-danger-600",
};

export function ContestsAdmin({
  events,
  selectedEvent,
  initialContests,
  initialEntries,
}: ContestsAdminProps) {
  const router = useRouter();

  const [contests, setContests] = useState(initialContests);
  const [entries, setEntries] = useState(initialEntries);

  // Igual que el panel de expositores: el estado local se re-sincroniza
  // durante el render cuando llegan props nuevas de un router.refresh().
  const [syncedContests, setSyncedContests] = useState(initialContests);
  const [syncedEntries, setSyncedEntries] = useState(initialEntries);
  if (initialContests !== syncedContests) {
    setSyncedContests(initialContests);
    setContests(initialContests);
  }
  if (initialEntries !== syncedEntries) {
    setSyncedEntries(initialEntries);
    setEntries(initialEntries);
  }

  const [type, setType] = useState<ContestTypeId>("dance_cover");
  const [name, setName] = useState(CONTEST_TYPES[0].defaultName);
  const [description, setDescription] = useState("");
  const [maxEntries, setMaxEntries] = useState("");
  const [deadline, setDeadline] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [openContestId, setOpenContestId] = useState<string | null>(null);
  const [confirmDeleteContest, setConfirmDeleteContest] = useState<string | null>(null);
  const [confirmDeleteEntry, setConfirmDeleteEntry] = useState<string | null>(null);

  function handleTypeChange(nextType: ContestTypeId) {
    const previous = getContestType(type);
    setType(nextType);
    // Sólo se pisa el nombre si seguía siendo el propuesto: si el admin
    // ya escribió el suyo, cambiar de tipo no se lo borra.
    if (!name.trim() || name === previous.defaultName) {
      setName(getContestType(nextType).defaultName);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Ponle nombre a la convocatoria.");
      return;
    }
    const limit = maxEntries.trim() ? Number(maxEntries) : null;
    if (limit !== null && (!Number.isInteger(limit) || limit <= 0)) {
      setError("El cupo debe ser un número entero mayor a cero, o dejarse vacío.");
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/contests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedEvent.id,
          type,
          name: name.trim(),
          description: description.trim(),
          maxEntries: limit,
          registrationDeadline: deadline || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "No pudimos crear la convocatoria.");
        return;
      }
      setContests((prev) => [...prev, data as ContestRow]);
      setDescription("");
      setMaxEntries("");
      setDeadline("");
      setName(getContestType(type).defaultName);
      router.refresh();
    } catch {
      setError("Ocurrió un error de conexión. Intenta de nuevo.");
    } finally {
      setCreating(false);
    }
  }

  /** Lanza si falla, para que la edición en línea pueda revertir. */
  async function patchContest(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/contests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "No pudimos guardar el cambio.");
        throw new Error(data.message || "patch failed");
      }
      const updated = (await res.json()) as ContestRow;
      setContests((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } finally {
      setBusyId(null);
    }
  }

  async function deleteContest(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/contests?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "No pudimos borrar la convocatoria.");
        return;
      }
      setContests((prev) => prev.filter((c) => c.id !== id));
    } finally {
      setBusyId(null);
      setConfirmDeleteContest(null);
    }
  }

  async function updateEntryStatus(id: string, status: ContestEntryStatus) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/contest-entries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
      }
    } finally {
      setBusyId(null);
    }
  }

  async function deleteEntry(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/contest-entries/${id}`, { method: "DELETE" });
      if (res.ok) {
        const entry = entries.find((e) => e.id === id);
        setEntries((prev) => prev.filter((e) => e.id !== id));
        if (entry) {
          setContests((prev) =>
            prev.map((c) =>
              c.id === entry.contest_id
                ? { ...c, entries_count: Math.max(c.entries_count - 1, 0) }
                : c
            )
          );
        }
      }
    } finally {
      setBusyId(null);
      setConfirmDeleteEntry(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">Convocatorias</h1>
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
                router.push(`/admin/dashboard/convocatorias?event=${e.target.value}`)
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
          <a href={`/api/admin/export-excel?event=${selectedEvent.id}`}>
            <Button variant="secondary">Descargar Excel</Button>
          </a>
          <Link href="/admin/dashboard">
            <Button variant="ghost">← Volver a expositores</Button>
          </Link>
        </div>
      </div>

      <Card className="mt-6 p-6">
        <h2 className="font-heading text-lg font-bold text-ink">Nueva convocatoria</h2>
        <p className="mt-1 text-sm text-ink-soft">
          El tipo decide qué preguntas ve quien se inscribe.
        </p>
        <form onSubmit={handleCreate} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Tipo de convocatoria</label>
              <select
                className={inputClass}
                value={type}
                onChange={(e) => handleTypeChange(e.target.value as ContestTypeId)}
              >
                {CONTEST_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-[13px] text-ink-soft">
                Pregunta:{" "}
                {getContestType(type)
                  .fields.map((f) => f.label)
                  .join(", ")}
                .
              </p>
            </div>
            <div>
              <label className={labelClass}>Nombre que verá la gente</label>
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Concurso de dance cover"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Descripción (opcional)</label>
            <textarea
              className={inputClass}
              rows={2}
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Reglas breves, premios, horario aproximado..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Límite de registros (opcional)</label>
              <input
                type="number"
                min={1}
                className={inputClass}
                value={maxEntries}
                onChange={(e) => setMaxEntries(e.target.value)}
                placeholder="Déjalo vacío para no poner tope"
              />
            </div>
            <div>
              <label className={labelClass}>Fecha límite de inscripción (opcional)</label>
              <input
                type="date"
                className={inputClass}
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>

          {error && <p className={formErrorBoxClass}>{error}</p>}

          <Button type="submit" disabled={creating}>
            {creating ? "Creando..." : "Crear convocatoria"}
          </Button>
        </form>
      </Card>

      {contests.length === 0 ? (
        <Card className="mt-6 p-8 text-center">
          <p className="text-ink-soft">
            Esta edición todavía no tiene convocatorias. Crea la primera arriba.
          </p>
        </Card>
      ) : (
        <div className="mt-6 space-y-4">
          {contests.map((contest) => {
            const contestType = getContestType(contest.type);
            const availability = contestAvailability(contest);
            const contestEntries = entries.filter((e) => e.contest_id === contest.id);
            const expanded = openContestId === contest.id;

            return (
              <Card key={contest.id} className="overflow-hidden p-0">
                <div className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-pink-700">
                        {contestType.label}
                      </p>
                      <InlineEdit
                        ariaLabel={`Nombre de la convocatoria ${contest.name}`}
                        value={contest.name}
                        className="-ml-2 font-heading text-lg font-bold text-ink"
                        onSave={(value) => patchContest(contest.id, { name: value })}
                      />
                      <InlineEdit
                        ariaLabel={`Descripción de ${contest.name}`}
                        value={contest.description ?? ""}
                        multiline
                        placeholder="Descripción (opcional): reglas breves, premios, horario…"
                        className="-ml-2 text-[13.5px] text-ink-soft"
                        onSave={(value) =>
                          patchContest(contest.id, { description: value })
                        }
                      />
                      <p className="mt-0.5 text-sm text-ink-soft">
                        {contest.entries_count} inscritos
                        {contest.max_entries != null
                          ? ` de ${contest.max_entries} · quedan ${availability.spotsLeft}`
                          : " · sin límite de cupo"}
                        {contest.registration_deadline &&
                          ` · cierra el ${formatDate(contest.registration_deadline)}`}
                        {contest.day && ` · ${formatDayLong(contest.day)}`}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        availability.open
                          ? "bg-mint-100 text-mint-500"
                          : "bg-gray-100 text-ink-soft"
                      }`}
                    >
                      {availability.open
                        ? "Inscripciones abiertas"
                        : (availability.closedReason ?? "Cerrada")}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button
                      variant="secondary"
                      disabled={busyId === contest.id}
                      onClick={() => patchContest(contest.id, { isOpen: !contest.is_open })}
                      className="!px-4 !py-1.5 text-xs"
                    >
                      {contest.is_open ? "Cerrar inscripciones" : "Abrir inscripciones"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setOpenContestId(expanded ? null : contest.id)}
                      className="!px-4 !py-1.5 text-xs"
                    >
                      {expanded
                        ? "Ocultar inscritos"
                        : `Ver inscritos (${contestEntries.length})`}
                    </Button>
                    <Link href={`/convocatorias/${contest.id}`} target="_blank">
                      <Button variant="ghost" className="!px-4 !py-1.5 text-xs">
                        Ver formulario ↗
                      </Button>
                    </Link>

                    <div className="ml-auto">
                      {confirmDeleteContest === contest.id ? (
                        <div className="flex items-center gap-2 rounded-xl bg-danger-50 px-2 py-1.5">
                          <span className="text-[11px] font-bold text-danger-600">
                            ¿Borrar la convocatoria?
                          </span>
                          <Button
                            variant="danger"
                            disabled={busyId === contest.id}
                            onClick={() => deleteContest(contest.id)}
                            className="!px-3 !py-1 text-xs"
                          >
                            Sí
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => setConfirmDeleteContest(null)}
                            className="!px-3 !py-1 text-xs"
                          >
                            No
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          onClick={() => setConfirmDeleteContest(contest.id)}
                          className="!px-4 !py-1.5 text-xs !text-danger-600"
                        >
                          Borrar
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <PrizeEditor
                      contest={contest}
                      event={selectedEvent}
                      busy={busyId === contest.id}
                      onSave={(body) => patchContest(contest.id, body)}
                    />
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>Límite de registros</label>
                      <input
                        type="number"
                        min={1}
                        defaultValue={contest.max_entries ?? ""}
                        placeholder="Sin límite"
                        disabled={busyId === contest.id}
                        onBlur={(e) => {
                          const raw = e.target.value.trim();
                          const value = raw ? Number(raw) : null;
                          if (value !== null && (!Number.isInteger(value) || value <= 0)) {
                            return;
                          }
                          if (value !== contest.max_entries) {
                            patchContest(contest.id, { maxEntries: value });
                          }
                        }}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Fecha límite de inscripción</label>
                      <input
                        type="date"
                        defaultValue={contest.registration_deadline ?? ""}
                        disabled={busyId === contest.id}
                        onChange={(e) =>
                          patchContest(contest.id, {
                            registrationDeadline: e.target.value || null,
                          })
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-pink-100 bg-cream/40">
                    {contestEntries.length === 0 ? (
                      <p className="px-5 py-6 text-center text-sm text-ink-soft">
                        Todavía nadie se inscribe en esta convocatoria.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[820px] text-left text-sm">
                          <thead>
                            <tr className="border-b border-pink-100 text-ink-soft">
                              <Th>Folio</Th>
                              <Th>{contestType.nameLabel}</Th>
                              <Th>Contacto</Th>
                              {contestType.fields.map((f) => (
                                <Th key={f.id}>{f.label}</Th>
                              ))}
                              <Th>Estatus</Th>
                              <Th>Acciones</Th>
                            </tr>
                          </thead>
                          <tbody>
                            {contestEntries.map((entry) => (
                              <tr
                                key={entry.id}
                                className="border-b border-pink-50 last:border-0"
                              >
                                <Td className="font-mono font-medium text-pink-700">
                                  #{entry.folio_number}
                                </Td>
                                <Td className="font-semibold">{entry.participant_name}</Td>
                                <Td>
                                  <div>{entry.phone}</div>
                                  {entry.email && (
                                    <div className="text-xs text-ink-soft">{entry.email}</div>
                                  )}
                                </Td>
                                {contestType.fields.map((f) => (
                                  <Td key={f.id} className="max-w-[240px] text-ink-soft">
                                    {entry.answers?.[f.id] ?? "—"}
                                  </Td>
                                ))}
                                <Td>
                                  <span
                                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE[entry.status]}`}
                                  >
                                    {STATUS_LABEL[entry.status]}
                                  </span>
                                </Td>
                                <Td>
                                  {confirmDeleteEntry === entry.id ? (
                                    <div className="min-w-[170px] rounded-xl bg-danger-50 p-2">
                                      <p className="text-[11px] font-bold text-danger-600">
                                        ¿Borrar el folio #{entry.folio_number}? Se libera su
                                        lugar.
                                      </p>
                                      <div className="mt-2 flex gap-2">
                                        <Button
                                          variant="danger"
                                          disabled={busyId === entry.id}
                                          onClick={() => deleteEntry(entry.id)}
                                          className="!px-3 !py-1 text-xs"
                                        >
                                          Sí, borrar
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          onClick={() => setConfirmDeleteEntry(null)}
                                          className="!px-3 !py-1 text-xs"
                                        >
                                          Cancelar
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex flex-wrap gap-1.5">
                                      {entry.status !== "approved" && (
                                        <Button
                                          variant="secondary"
                                          disabled={busyId === entry.id}
                                          onClick={() =>
                                            updateEntryStatus(entry.id, "approved")
                                          }
                                          className="!px-3 !py-1 text-xs"
                                        >
                                          Aceptar
                                        </Button>
                                      )}
                                      {entry.status !== "rejected" && (
                                        <Button
                                          variant="ghost"
                                          disabled={busyId === entry.id}
                                          onClick={() =>
                                            updateEntryStatus(entry.id, "rejected")
                                          }
                                          className="!px-3 !py-1 text-xs"
                                        >
                                          Rechazar
                                        </Button>
                                      )}
                                      <Button
                                        variant="ghost"
                                        onClick={() => setConfirmDeleteEntry(entry.id)}
                                        className="!px-3 !py-1 text-xs !text-danger-600"
                                      >
                                        Borrar
                                      </Button>
                                    </div>
                                  )}
                                </Td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold">{children}</th>;
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 align-top ${className ?? ""}`}>{children}</td>;
}
