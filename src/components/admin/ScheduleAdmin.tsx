"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { eventDays, formatDayLong } from "@/lib/eventDays";
import { formErrorBoxClass, inputClass, labelClass } from "@/lib/formClasses";
import { formatTimeRange } from "@/lib/formatTime";
import type { EventRow, EventScheduleRow } from "@/lib/types";

interface ScheduleAdminProps {
  event: EventRow;
  initialBlocks: EventScheduleRow[];
}

const KIND_LABEL = {
  montaje: "Montaje / logística",
  actividad: "Actividad",
} as const;

export function ScheduleAdmin({ event, initialBlocks }: ScheduleAdminProps) {
  const router = useRouter();
  const days = eventDays(event.date_start, event.date_end);

  const [blocks, setBlocks] = useState(initialBlocks);
  const [synced, setSynced] = useState(initialBlocks);
  if (initialBlocks !== synced) {
    setSynced(initialBlocks);
    setBlocks(initialBlocks);
  }

  const [day, setDay] = useState(days[0] ?? "");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [kind, setKind] = useState<"montaje" | "actividad">("actividad");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!day || !startTime || !title.trim()) {
      setError("Necesito al menos el día, la hora de inicio y qué pasa.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          day,
          startTime,
          endTime,
          title: title.trim(),
          notes: notes.trim(),
          kind,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "No pudimos agregar el bloque.");
        return;
      }
      setBlocks((prev) => [...prev, data as EventScheduleRow]);
      setStartTime("");
      setEndTime("");
      setTitle("");
      setNotes("");
      router.refresh();
    } catch {
      setError("Ocurrió un error de conexión. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function loadTemplate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: true, eventId: event.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "No pudimos cargar la plantilla.");
        return;
      }
      setBlocks((prev) => [...prev, ...(data as EventScheduleRow[])]);
      router.refresh();
    } catch {
      setError("Ocurrió un error de conexión. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function patchBlock(id: string, body: Record<string, unknown>) {
    const res = await fetch("/api/admin/schedule", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    if (res.ok) {
      const updated = (await res.json()) as EventScheduleRow;
      setBlocks((prev) => prev.map((b) => (b.id === id ? updated : b)));
    }
  }

  async function deleteBlock(id: string) {
    const res = await fetch(`/api/admin/schedule?id=${id}`, { method: "DELETE" });
    if (res.ok) setBlocks((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-bold text-ink">
            Cronograma e itinerario
          </h2>
          <p className="mt-0.5 text-sm text-ink-soft">
            Lo que sale impreso en el plan que le mandas a la sede.
          </p>
        </div>
        {blocks.length === 0 && (
          <Button variant="secondary" disabled={busy} onClick={loadTemplate}>
            Usar el cronograma de siempre
          </Button>
        )}
      </div>

      <Card className="mt-4 p-5">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className={labelClass}>Día</label>
              <select
                className={inputClass}
                value={day}
                onChange={(e) => setDay(e.target.value)}
              >
                {days.map((d) => (
                  <option key={d} value={d}>
                    {formatDayLong(d)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Desde</label>
              <input
                type="time"
                className={inputClass}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Hasta (opcional)</label>
              <input
                type="time"
                className={inputClass}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Tipo</label>
              <select
                className={inputClass}
                value={kind}
                onChange={(e) => setKind(e.target.value as "montaje" | "actividad")}
              >
                <option value="actividad">Actividad</option>
                <option value="montaje">Montaje / logística</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>¿Qué pasa?</label>
            <input
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Concurso de cosplay"
            />
          </div>

          <div>
            <label className={labelClass}>Nota (opcional)</label>
            <input
              className={inputClass}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles para el staff o la sede"
            />
          </div>

          {error && <p className={formErrorBoxClass}>{error}</p>}

          <Button type="submit" disabled={busy}>
            {busy ? "Guardando..." : "Agregar al itinerario"}
          </Button>
        </form>
      </Card>

      <div className="mt-5 space-y-5">
        {days.map((d) => {
          const dayBlocks = blocks
            .filter((b) => b.day === d)
            .sort((a, b) => a.start_time.localeCompare(b.start_time));

          return (
            <div key={d}>
              <h3 className="font-heading text-lg font-bold text-ink">
                {formatDayLong(d)}
              </h3>
              {dayBlocks.length === 0 ? (
                <p className="mt-1 text-sm text-ink-soft">
                  Sin bloques todavía.
                </p>
              ) : (
                <div className="mt-2 space-y-2">
                  {dayBlocks.map((block) => (
                    <Card key={block.id} className="flex flex-wrap items-center gap-3 p-3">
                      <span className="w-[132px] shrink-0 font-mono text-[13px] text-pink-700">
                        {formatTimeRange(block.start_time, block.end_time)}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          block.kind === "montaje"
                            ? "bg-lavender-100 text-lavender-500"
                            : "bg-mint-100 text-mint-500"
                        }`}
                      >
                        {KIND_LABEL[block.kind]}
                      </span>
                      <input
                        defaultValue={block.title}
                        onBlur={(e) => {
                          const value = e.target.value.trim();
                          if (value && value !== block.title) {
                            patchBlock(block.id, { title: value });
                          }
                        }}
                        className="min-w-[180px] flex-1 rounded-xl border-2 border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-ink hover:border-pink-100 focus:border-pink-500 focus:outline-none"
                      />
                      {block.notes && (
                        <span className="w-full text-xs text-ink-soft sm:w-auto">
                          {block.notes}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        onClick={() => deleteBlock(block.id)}
                        className="!px-3 !py-1 text-xs !text-danger-600"
                      >
                        Quitar
                      </Button>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
