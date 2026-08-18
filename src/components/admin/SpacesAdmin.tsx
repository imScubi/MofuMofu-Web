"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { InlineEdit } from "@/components/admin/InlineEdit";
import { formErrorBoxClass, inputClass, labelClass } from "@/lib/formClasses";
import { PRICING_PLANS, type PricingPlan } from "@/lib/eventConfig";
import { RESERVABLE_STAND_IDS } from "@/lib/standLayout";
import {
  formatStandRanges,
  parseExtraPlans,
  parseStandRanges,
  plansForEvent,
  zoneOccupancy,
} from "@/lib/zones";
import type { EventRow, EventStandRow, EventZoneRow } from "@/lib/types";

interface SpacesAdminProps {
  events: EventRow[];
  selectedEvent: EventRow;
  initialZones: EventZoneRow[];
  stands: EventStandRow[];
}

/** Un identificador legible a partir del nombre: "Artistas" → "artistas". */
function slugify(label: string) {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);
}

export function SpacesAdmin({
  events,
  selectedEvent,
  initialZones,
  stands,
}: SpacesAdminProps) {
  const router = useRouter();

  const [zones, setZones] = useState(initialZones);
  const [syncedZones, setSyncedZones] = useState(initialZones);
  if (initialZones !== syncedZones) {
    setSyncedZones(initialZones);
    setZones(initialZones);
  }

  const [extraPlans, setExtraPlans] = useState<PricingPlan[]>(() =>
    parseExtraPlans(selectedEvent.extra_plans)
  );
  const [syncedEventId, setSyncedEventId] = useState(selectedEvent.id);
  if (selectedEvent.id !== syncedEventId) {
    setSyncedEventId(selectedEvent.id);
    setExtraPlans(parseExtraPlans(selectedEvent.extra_plans));
  }

  const allPlans = plansForEvent(extraPlans);
  const occupied = stands
    .filter((s) => s.status === "sold" || s.status === "pending")
    .map((s) => s.stand_id);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // --- Plan nuevo ---------------------------------------------------
  const [planLabel, setPlanLabel] = useState("");
  const [planPrice, setPlanPrice] = useState("");
  const [planDays, setPlanDays] = useState<1 | 2>(1);
  const [planShared, setPlanShared] = useState(false);

  async function savePlans(next: PricingPlan[]) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedEvent.id,
          extraPlans: next.map((plan) => ({
            id: plan.id,
            categoryLabel: plan.categoryLabel,
            days: plan.days,
            price: plan.price,
            shared: plan.shared,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "No pudimos guardar los planes.");
        throw new Error("patch failed");
      }
      setExtraPlans(next);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleAddPlan(e: FormEvent) {
    e.preventDefault();
    const label = planLabel.trim();
    const price = Number(planPrice);
    if (!label || !Number.isFinite(price) || price < 0) {
      setError("El plan necesita un nombre y un precio.");
      return;
    }

    const base = slugify(label) || "plan";
    // El id lleva los días porque un mismo nombre suele tener versión de
    // uno y de dos días, y son planes distintos.
    let id = `${base}_${planDays}`;
    let n = 2;
    while (allPlans.some((plan) => plan.id === id)) id = `${base}_${planDays}_${n++}`;

    try {
      await savePlans([
        ...extraPlans,
        {
          id,
          category: "varios",
          categoryLabel: label,
          days: planDays,
          price,
          shared: planShared,
        },
      ]);
      setPlanLabel("");
      setPlanPrice("");
      setPlanShared(false);
    } catch {
      /* el mensaje ya está en pantalla */
    }
  }

  async function removePlan(id: string) {
    const usedBy = zones.filter((zone) => zone.plan_ids.includes(id));
    if (
      usedBy.length > 0 &&
      !confirm(
        `Ese plan es el único permitido en ${usedBy
          .map((z) => z.label)
          .join(", ")} o parte de él. Si lo quitas, esa zona ya no lo admitirá. ¿Continuar?`
      )
    ) {
      return;
    }
    try {
      await savePlans(extraPlans.filter((plan) => plan.id !== id));
    } catch {
      /* ya avisado */
    }
  }

  // --- Zona nueva ---------------------------------------------------
  const [zoneLabel, setZoneLabel] = useState("");
  const [zoneRange, setZoneRange] = useState("");
  const [zonePlans, setZonePlans] = useState<string[]>([]);
  const [zoneMax, setZoneMax] = useState("");

  async function handleAddZone(e: FormEvent) {
    e.preventDefault();
    const label = zoneLabel.trim();
    const { standIds, unknown } = parseStandRanges(zoneRange, RESERVABLE_STAND_IDS);

    if (!label) {
      setError("Ponle nombre a la zona (ej. Pasillo de comida).");
      return;
    }
    if (standIds.length === 0) {
      setError("Escribe qué lugares forman la zona, por ejemplo 30-35.");
      return;
    }
    if (unknown.length > 0) {
      setError(`Estos lugares no existen en el mapa: ${unknown.join(", ")}.`);
      return;
    }
    if (zonePlans.length === 0) {
      setError("Marca qué planes pueden ocupar la zona.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedEvent.id,
          label,
          standIds,
          planIds: zonePlans,
          maxExhibitors: zoneMax.trim() ? Number(zoneMax) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "No pudimos crear la zona.");
        return;
      }
      setZones((prev) => [...prev, data as EventZoneRow]);
      setZoneLabel("");
      setZoneRange("");
      setZonePlans([]);
      setZoneMax("");
      router.refresh();
    } catch {
      setError("Ocurrió un error de conexión. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function patchZone(id: string, body: Record<string, unknown>) {
    setError(null);
    const res = await fetch("/api/admin/zones", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "No pudimos guardar el cambio.");
      throw new Error("patch failed");
    }
    const updated = (await res.json()) as EventZoneRow;
    setZones((prev) => prev.map((zone) => (zone.id === id ? updated : zone)));
    router.refresh();
  }

  async function deleteZone(id: string) {
    const res = await fetch(`/api/admin/zones?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setZones((prev) => prev.filter((zone) => zone.id !== id));
      router.refresh();
    }
  }

  function togglePlan(planId: string) {
    setZonePlans((prev) =>
      prev.includes(planId) ? prev.filter((id) => id !== planId) : [...prev, planId]
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">Planes y zonas</h1>
          <p className="mt-0.5 text-sm text-ink-soft">
            Quién puede apartar qué lugar en {selectedEvent.name}.
          </p>
        </div>
        <Link href="/admin/dashboard/eventos">
          <Button variant="ghost">← Volver a ediciones</Button>
        </Link>
      </div>

      {events.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {events.map((event) => (
            <Link key={event.id} href={`/admin/dashboard/espacios?event=${event.id}`}>
              <Button
                variant={event.id === selectedEvent.id ? "primary" : "ghost"}
                className="!px-4 !py-1.5 text-xs"
              >
                {event.name}
              </Button>
            </Link>
          ))}
        </div>
      )}

      {error && <p className={`mt-6 ${formErrorBoxClass}`}>{error}</p>}

      {/* ---------------------------------------------------------- */}
      <h2 className="mt-8 font-heading text-xl font-bold text-ink">
        Planes de esta edición
      </h2>
      <p className="mt-0.5 text-sm text-ink-soft">
        A los de siempre puedes sumarle los tuyos, por ejemplo Artistas.
      </p>

      <Card className="mt-4 p-5">
        <div className="space-y-2">
          {PRICING_PLANS.map((plan) => (
            <div
              key={plan.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-cream px-4 py-2.5 text-sm"
            >
              <span className="font-semibold text-ink">
                {plan.categoryLabel}
                <span className="ml-2 font-normal text-ink-soft">
                  {plan.days} {plan.days === 1 ? "día" : "días"}
                  {plan.shared ? " · compartido" : ""}
                </span>
              </span>
              <span className="font-mono text-ink-soft">
                ${plan.price.toLocaleString("es-MX")}
              </span>
            </div>
          ))}

          {extraPlans.map((plan) => (
            <div
              key={plan.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-lavender-100/60 px-4 py-2.5 text-sm"
            >
              <span className="min-w-[180px] flex-1 font-semibold text-ink">
                <InlineEdit
                  ariaLabel={`Nombre del plan ${plan.categoryLabel}`}
                  value={plan.categoryLabel}
                  className="-ml-2 font-semibold text-ink"
                  onSave={(value) =>
                    savePlans(
                      extraPlans.map((p) =>
                        p.id === plan.id ? { ...p, categoryLabel: value } : p
                      )
                    )
                  }
                />
                <span className="ml-2 text-xs font-normal text-ink-soft">
                  {plan.days} {plan.days === 1 ? "día" : "días"}
                  {plan.shared ? " · compartido" : ""}
                </span>
              </span>
              <span className="w-[110px] font-mono text-ink-soft">
                <InlineEdit
                  ariaLabel={`Precio del plan ${plan.categoryLabel}`}
                  value={String(plan.price)}
                  className="font-mono text-ink-soft"
                  onSave={(value) => {
                    const price = Number(value);
                    if (!Number.isFinite(price) || price < 0) {
                      throw new Error("precio inválido");
                    }
                    return savePlans(
                      extraPlans.map((p) => (p.id === plan.id ? { ...p, price } : p))
                    );
                  }}
                />
              </span>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => removePlan(plan.id)}
                className="!px-3 !py-1 text-xs !text-danger-600"
              >
                Quitar
              </Button>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddPlan} className="mt-5 grid gap-4 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>Nombre del plan</label>
            <input
              className={inputClass}
              value={planLabel}
              onChange={(e) => setPlanLabel(e.target.value)}
              placeholder="Ej. Artistas"
            />
          </div>
          <div>
            <label className={labelClass}>Precio</label>
            <input
              type="number"
              min={0}
              className={inputClass}
              value={planPrice}
              onChange={(e) => setPlanPrice(e.target.value)}
              placeholder="1500"
            />
          </div>
          <div>
            <label className={labelClass}>Días</label>
            <select
              className={inputClass}
              value={planDays}
              onChange={(e) => setPlanDays(Number(e.target.value) === 2 ? 2 : 1)}
            >
              <option value={1}>1 día</option>
              <option value={2}>2 días</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-ink sm:col-span-2">
            <input
              type="checkbox"
              checked={planShared}
              onChange={(e) => setPlanShared(e.target.checked)}
              className="h-4 w-4 rounded border-pink-300 text-pink-500 focus:ring-pink-300"
            />
            Es un espacio compartido
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Guardando..." : "Agregar plan"}
            </Button>
          </div>
        </form>
      </Card>

      {/* ---------------------------------------------------------- */}
      <h2 className="mt-8 font-heading text-xl font-bold text-ink">
        Zonas del mapa
      </h2>
      <p className="mt-0.5 text-sm text-ink-soft">
        Una zona aparta ciertos lugares para ciertos planes. Ojo: si un plan
        aparece en alguna zona, ya sólo podrá apartar lugares de sus zonas.
      </p>

      <Card className="mt-4 p-5">
        <form onSubmit={handleAddZone} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Nombre de la zona</label>
              <input
                className={inputClass}
                value={zoneLabel}
                onChange={(e) => setZoneLabel(e.target.value)}
                placeholder="Ej. Pasillo de comida"
              />
            </div>
            <div>
              <label className={labelClass}>Lugares</label>
              <input
                className={inputClass}
                value={zoneRange}
                onChange={(e) => setZoneRange(e.target.value)}
                placeholder="30-35"
              />
            </div>
            <div>
              <label className={labelClass}>Máximo de expositores</label>
              <input
                type="number"
                min={1}
                className={inputClass}
                value={zoneMax}
                onChange={(e) => setZoneMax(e.target.value)}
                placeholder="Sin tope"
              />
            </div>
          </div>
          <p className="-mt-2 text-[13px] text-ink-soft">
            Los lugares se escriben como los dices: <strong>30-35</strong>,{" "}
            <strong>1 al 5</strong> o sueltos separados por coma. El tope sirve
            cuando quieres menos expositores que lugares (ej. 5 de comida en 6
            espacios); déjalo en blanco si no hay tope.
          </p>

          <div>
            <span className={labelClass}>Planes que pueden ocuparla</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {allPlans.map((plan) => (
                <label
                  key={plan.id}
                  className={`cursor-pointer rounded-full border-2 px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                    zonePlans.includes(plan.id)
                      ? "border-pink-500 bg-pink-50 text-pink-700"
                      : "border-pink-100 bg-white text-ink-soft hover:border-pink-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={zonePlans.includes(plan.id)}
                    onChange={() => togglePlan(plan.id)}
                  />
                  {plan.categoryLabel} · {plan.days}d
                </label>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={busy}>
            {busy ? "Guardando..." : "Crear zona"}
          </Button>
        </form>
      </Card>

      <div className="mt-5 space-y-4">
        {zones.length === 0 && (
          <p className="text-sm text-ink-soft">
            Sin zonas: cualquier plan puede apartar cualquier lugar libre.
          </p>
        )}

        {zones.map((zone) => {
          const used = zoneOccupancy(zone, occupied);
          const cap = zone.max_exhibitors ?? zone.stand_ids.length;

          return (
            <Card key={zone.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <InlineEdit
                    ariaLabel={`Nombre de la zona ${zone.label}`}
                    value={zone.label}
                    className="-ml-2 font-heading text-lg font-bold text-ink"
                    onSave={(value) => patchZone(zone.id, { label: value })}
                  />
                  <p className="mt-0.5 text-sm text-ink-soft">
                    {used} de {cap} ocupados
                    {zone.max_exhibitors != null && used >= zone.max_exhibitors
                      ? " · llena"
                      : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => deleteZone(zone.id)}
                  className="!px-3 !py-1 text-xs !text-danger-600"
                >
                  Eliminar zona
                </Button>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Lugares</label>
                  <input
                    className={inputClass}
                    defaultValue={formatStandRanges(zone.stand_ids)}
                    onBlur={(e) => {
                      const { standIds, unknown } = parseStandRanges(
                        e.target.value,
                        RESERVABLE_STAND_IDS
                      );
                      if (unknown.length > 0) {
                        setError(
                          `Estos lugares no existen en el mapa: ${unknown.join(", ")}.`
                        );
                        e.target.value = formatStandRanges(zone.stand_ids);
                        return;
                      }
                      if (standIds.join(",") !== zone.stand_ids.join(",")) {
                        patchZone(zone.id, { standIds }).catch(() => {
                          e.target.value = formatStandRanges(zone.stand_ids);
                        });
                      }
                    }}
                  />
                </div>
                <div>
                  <label className={labelClass}>Máximo de expositores</label>
                  <input
                    type="number"
                    min={1}
                    className={inputClass}
                    defaultValue={zone.max_exhibitors ?? ""}
                    placeholder="Sin tope"
                    onBlur={(e) => {
                      const raw = e.target.value.trim();
                      const next = raw ? Number(raw) : null;
                      if (next !== zone.max_exhibitors) {
                        patchZone(zone.id, { maxExhibitors: next }).catch(() => {
                          e.target.value = String(zone.max_exhibitors ?? "");
                        });
                      }
                    }}
                  />
                </div>
              </div>

              <div className="mt-3">
                <span className={labelClass}>Planes que pueden ocuparla</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {allPlans.map((plan) => {
                    const on = zone.plan_ids.includes(plan.id);
                    return (
                      <label
                        key={plan.id}
                        className={`cursor-pointer rounded-full border-2 px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                          on
                            ? "border-pink-500 bg-pink-50 text-pink-700"
                            : "border-pink-100 bg-white text-ink-soft hover:border-pink-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={on}
                          onChange={() => {
                            const next = on
                              ? zone.plan_ids.filter((id) => id !== plan.id)
                              : [...zone.plan_ids, plan.id];
                            patchZone(zone.id, { planIds: next }).catch(() => {});
                          }}
                        />
                        {plan.categoryLabel} · {plan.days}d
                      </label>
                    );
                  })}
                </div>
                {/* Un plan que quedó fuera de la lista de planes de la
                    edición dejaría la zona bloqueada sin que se note. */}
                {zone.plan_ids.some(
                  (id) => !allPlans.some((plan) => plan.id === id)
                ) && (
                  <p className="mt-2 text-[13px] text-danger-600">
                    Esta zona apunta a un plan que ya no existe (
                    {zone.plan_ids
                      .filter((id) => !allPlans.some((plan) => plan.id === id))
                      .join(", ")}
                    ). Sus lugares quedan bloqueados hasta que lo corrijas.
                  </p>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
