"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatDate, formatEventDates } from "@/lib/formatDates";
import type { EventRow } from "@/lib/types";

const inputClass =
  "w-full rounded-2xl border border-pink-100 bg-white px-4 py-2.5 text-ink focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-100";
const labelClass = "text-sm font-semibold text-ink";

export function EventsAdmin({ initialEvents }: { initialEvents: EventRow[] }) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [syncedEvents, setSyncedEvents] = useState(initialEvents);
  if (initialEvents !== syncedEvents) {
    setSyncedEvents(initialEvents);
    setEvents(initialEvents);
  }

  const [name, setName] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [paymentDeadline, setPaymentDeadline] = useState("");
  const [restrictedGiros, setRestrictedGiros] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !dateStart || !dateEnd || !paymentDeadline) {
      setError("Completa el nombre, las fechas del evento y la fecha límite de pago.");
      return;
    }
    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          dateStart,
          dateEnd,
          paymentDeadline,
          restrictedGirosEnabled: restrictedGiros,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "No pudimos crear la edición.");
        return;
      }
      setEvents((prev) => [...prev, data as EventRow]);
      setName("");
      setDateStart("");
      setDateEnd("");
      setPaymentDeadline("");
      setRestrictedGiros(false);
      router.refresh();
    } catch {
      setError("Ocurrió un error de conexión. Intenta de nuevo.");
    } finally {
      setCreating(false);
    }
  }

  async function patchEvent(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      if (res.ok) {
        const updated = (await res.json()) as EventRow;
        setEvents((prev) => prev.map((ev) => (ev.id === id ? updated : ev)));
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold text-ink">
          Ediciones del evento
        </h1>
        <Link href="/admin/dashboard">
          <Button variant="ghost">← Volver a registros</Button>
        </Link>
      </div>

      <Card className="mt-6 p-6">
        <h2 className="font-heading text-lg font-bold text-ink">Nueva edición</h2>
        <form onSubmit={handleCreate} className="mt-4 space-y-4">
          <div>
            <label className={labelClass}>Nombre de la edición</label>
            <input
              className={`${inputClass} mt-1.5`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Edición Diciembre 2026"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Primer día del evento</label>
              <input
                type="date"
                className={`${inputClass} mt-1.5`}
                value={dateStart}
                onChange={(e) => {
                  setDateStart(e.target.value);
                  if (!dateEnd) setDateEnd(e.target.value);
                }}
              />
            </div>
            <div>
              <label className={labelClass}>Último día del evento</label>
              <input
                type="date"
                className={`${inputClass} mt-1.5`}
                value={dateEnd}
                min={dateStart || undefined}
                onChange={(e) => setDateEnd(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Fecha límite de pago</label>
              <input
                type="date"
                className={`${inputClass} mt-1.5`}
                value={paymentDeadline}
                onChange={(e) => setPaymentDeadline(e.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-semibold text-ink">
            <input
              type="checkbox"
              checked={restrictedGiros}
              onChange={(e) => setRestrictedGiros(e.target.checked)}
              className="h-4 w-4 rounded border-pink-300 text-pink-500 focus:ring-pink-300"
            />
            Mostrar la lista de giros restringidos en esta edición
          </label>

          {error && (
            <p className="rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
          )}

          <Button type="submit" disabled={creating}>
            {creating ? "Creando..." : "Crear edición 🎀"}
          </Button>
        </form>
      </Card>

      <div className="mt-6 space-y-4">
        {events.map((event) => (
          <Card key={event.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-heading text-lg font-bold text-ink">{event.name}</h3>
                <p className="mt-0.5 text-sm text-ink-soft">
                  {formatEventDates(event.date_start, event.date_end)}
                </p>
                <p className="text-sm text-ink-soft">
                  Límite de pago: {formatDate(event.payment_deadline)}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  event.is_open
                    ? "bg-mint-100 text-mint-500"
                    : "bg-gray-100 text-ink-soft"
                }`}
              >
                {event.is_open ? "Registro abierto" : "Registro cerrado"}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-ink">
                <input
                  type="checkbox"
                  checked={event.restricted_giros_enabled}
                  disabled={busyId === event.id}
                  onChange={(e) =>
                    patchEvent(event.id, { restrictedGirosEnabled: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-pink-300 text-pink-500 focus:ring-pink-300"
                />
                Giros restringidos
              </label>

              <Button
                variant="secondary"
                disabled={busyId === event.id}
                onClick={() => patchEvent(event.id, { isOpen: !event.is_open })}
                className="!px-4 !py-1.5 text-xs"
              >
                {event.is_open ? "Cerrar registro" : "Abrir registro"}
              </Button>

              <Link href={`/admin/dashboard?event=${event.id}`}>
                <Button variant="ghost" className="!px-4 !py-1.5 text-xs">
                  Ver registros
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
