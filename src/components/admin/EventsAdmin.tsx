"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formErrorBoxClass, inputClass, labelClass } from "@/lib/formClasses";
import { InlineEdit } from "@/components/admin/InlineEdit";
import { eventVenue, VENUE } from "@/lib/eventConfig";
import { formatDate, formatEventDates } from "@/lib/formatDates";
import type { EventRow } from "@/lib/types";


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
  const [venueName, setVenueName] = useState("");
  const [venueCity, setVenueCity] = useState("");
  const [venueMapsUrl, setVenueMapsUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
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
          venueName: venueName.trim(),
          venueCity: venueCity.trim(),
          venueMapsUrl: venueMapsUrl.trim(),
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
      setVenueName("");
      setVenueCity("");
      setVenueMapsUrl("");
      router.refresh();
    } catch {
      setError("Ocurrió un error de conexión. Intenta de nuevo.");
    } finally {
      setCreating(false);
    }
  }

  /**
   * Lanza si el guardado falla: los campos que se editan en línea
   * necesitan enterarse para revertir y avisar, en vez de dejar en
   * pantalla un texto que en realidad no se guardó.
   */
  async function patchEvent(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    setEditError(null);
    try {
      const res = await fetch("/api/admin/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setEditError(data.message || "No pudimos guardar el cambio.");
        throw new Error(data.message || "patch failed");
      }
      const updated = (await res.json()) as EventRow;
      setEvents((prev) => prev.map((ev) => (ev.id === id ? updated : ev)));
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
              className={inputClass}
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
                className={inputClass}
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
                className={inputClass}
                value={dateEnd}
                min={dateStart || undefined}
                onChange={(e) => setDateEnd(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Fecha límite de pago</label>
              <input
                type="date"
                className={inputClass}
                value={paymentDeadline}
                onChange={(e) => setPaymentDeadline(e.target.value)}
              />
            </div>
          </div>

          {/* La sede cambia entre ediciones; en blanco se usa la de
              siempre para no tener que reescribirla cada vez. */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Sede</label>
              <input
                className={inputClass}
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder={VENUE.name}
              />
            </div>
            <div>
              <label className={labelClass}>Ciudad</label>
              <input
                className={inputClass}
                value={venueCity}
                onChange={(e) => setVenueCity(e.target.value)}
                placeholder={VENUE.city}
              />
            </div>
            <div>
              <label className={labelClass}>Link de Google Maps</label>
              <input
                type="url"
                className={inputClass}
                value={venueMapsUrl}
                onChange={(e) => setVenueMapsUrl(e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>
          <p className="-mt-2 text-[13px] text-ink-soft">
            Si dejas la sede en blanco se usa {VENUE.name}, {VENUE.city}. Si la
            edición es fuera de {VENUE.state}, escribe el estado junto a la
            ciudad (ej. &quot;Saltillo, Coahuila&quot;).
          </p>

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
            <p className={formErrorBoxClass}>{error}</p>
          )}

          <Button type="submit" disabled={creating}>
            {creating ? "Creando..." : "Crear edición"}
          </Button>
        </form>
      </Card>

      {editError && (
        <p className={`mt-6 ${formErrorBoxClass}`}>{editError}</p>
      )}

      <div className="mt-6 space-y-4">
        {events.map((event) => (
          <Card key={event.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {/* El nombre se corrige aquí mismo: una falta de
                    ortografía no debería costar borrar la edición y
                    volver a capturarla con todo lo que cuelga de ella. */}
                <InlineEdit
                  ariaLabel={`Nombre de la edición ${event.name}`}
                  value={event.name}
                  className="-ml-2 font-heading text-lg font-bold text-ink"
                  onSave={(value) => patchEvent(event.id, { name: value })}
                />
                <p className="mt-0.5 text-sm text-ink-soft">
                  {formatEventDates(event.date_start, event.date_end)}
                </p>
                <p className="text-sm text-ink-soft">
                  Límite de pago: {formatDate(event.payment_deadline)}
                </p>
                <p className="text-sm text-ink-soft">
                  Sede: {eventVenue(event).line || "sin definir"}
                  {!event.venue_name && !event.venue_city && (
                    <span className="ml-1 text-xs">(la de siempre)</span>
                  )}
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

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Primer día</label>
                <InlineEdit
                  ariaLabel="Primer día del evento"
                  inputType="date"
                  value={event.date_start}
                  className="text-sm text-ink"
                  onSave={(value) => patchEvent(event.id, { dateStart: value })}
                />
              </div>
              <div>
                <label className={labelClass}>Último día</label>
                <InlineEdit
                  ariaLabel="Último día del evento"
                  inputType="date"
                  value={event.date_end}
                  className="text-sm text-ink"
                  onSave={(value) => patchEvent(event.id, { dateEnd: value })}
                />
              </div>
              <div>
                <label className={labelClass}>Fecha límite de pago</label>
                <InlineEdit
                  ariaLabel="Fecha límite de pago"
                  inputType="date"
                  value={event.payment_deadline}
                  className="text-sm text-ink"
                  onSave={(value) =>
                    patchEvent(event.id, { paymentDeadline: value })
                  }
                />
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Sede de esta edición</label>
                <input
                  className={inputClass}
                  defaultValue={event.venue_name ?? ""}
                  placeholder={VENUE.name}
                  disabled={busyId === event.id}
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    if (value !== (event.venue_name ?? "")) {
                      patchEvent(event.id, { venueName: value });
                    }
                  }}
                />
              </div>
              <div>
                <label className={labelClass}>Ciudad</label>
                <input
                  className={inputClass}
                  defaultValue={event.venue_city ?? ""}
                  placeholder={VENUE.city}
                  disabled={busyId === event.id}
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    if (value !== (event.venue_city ?? "")) {
                      patchEvent(event.id, { venueCity: value });
                    }
                  }}
                />
              </div>
              <div>
                <label className={labelClass}>Link de Google Maps</label>
                <input
                  type="url"
                  className={inputClass}
                  defaultValue={event.venue_maps_url ?? ""}
                  placeholder="Opcional"
                  disabled={busyId === event.id}
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    if (value !== (event.venue_maps_url ?? "")) {
                      patchEvent(event.id, { venueMapsUrl: value });
                    }
                  }}
                />
              </div>
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

              <Link href={`/admin/dashboard/espacios?event=${event.id}`}>
                <Button variant="ghost" className="!px-4 !py-1.5 text-xs">
                  Planes y zonas
                </Button>
              </Link>

              <Link href={`/admin/dashboard/convocatorias?event=${event.id}`}>
                <Button variant="ghost" className="!px-4 !py-1.5 text-xs">
                  Convocatorias
                </Button>
              </Link>

              <Link href={`/admin/dashboard/encuestas?event=${event.id}`}>
                <Button variant="ghost" className="!px-4 !py-1.5 text-xs">
                  Encuestas
                </Button>
              </Link>

              <Link href={`/admin/dashboard/plan?event=${event.id}`}>
                <Button variant="ghost" className="!px-4 !py-1.5 text-xs">
                  Plan logístico
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
