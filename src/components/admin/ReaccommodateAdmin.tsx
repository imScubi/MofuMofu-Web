"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { findGapPlans, occupiedStands, type StandMove } from "@/lib/reaccommodation";
import { standsInRowOrder } from "@/lib/standLayout";
import { formErrorBoxClass, inputClass, labelClass } from "@/lib/formClasses";
import type { EventRow, RegistrationRow } from "@/lib/types";

interface ReaccommodateAdminProps {
  event: EventRow;
  registrations: RegistrationRow[];
}

/**
 * Cierra los huecos que deja una cancelación.
 *
 * Muestra cada hueco con dos salidas y sus movimientos exactos antes de
 * tocar nada: mover a un expositor de lugar es algo que hay que poder
 * leer completo antes de aceptar, no un botón mágico.
 */
export function ReaccommodateAdmin({ event, registrations }: ReaccommodateAdminProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const gapPlans = useMemo(() => findGapPlans(registrations), [registrations]);
  const occupied = useMemo(() => occupiedStands(registrations), [registrations]);

  const [manualId, setManualId] = useState("");
  const [manualTo, setManualTo] = useState("");

  const active = registrations.filter(
    (r) => r.status !== "rejected" && r.status !== "cancelled"
  );
  const freeStands = standsInRowOrder().filter((id) => !occupied.has(id));

  async function apply(moves: StandMove[]) {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const res = await fetch("/api/admin/reaccommodate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          moves: moves.map((m) => ({
            registrationId: m.registrationId,
            from: m.from,
            to: m.to,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "No pudimos aplicar el reacomodo.");
        return;
      }
      setDone(
        `Listo: ${moves.length} ${moves.length === 1 ? "movimiento aplicado" : "movimientos aplicados"}.`
      );
      router.refresh();
    } catch {
      setError("Ocurrió un error de conexión. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  function applyManual() {
    const registration = active.find((r) => r.id === manualId);
    if (!registration || !manualTo) {
      setError("Elige el expositor y el stand al que se mueve.");
      return;
    }
    apply([
      {
        registrationId: registration.id,
        businessName: registration.business_name,
        from: registration.stand_id,
        to: manualTo,
      },
    ]);
    setManualId("");
    setManualTo("");
  }

  return (
    <div>
      <h2 className="font-heading text-xl font-bold text-ink">
        Reacomodo de stands
      </h2>
      <p className="mt-0.5 text-sm text-ink-soft">
        Un hueco es un lugar vacío que quedó en medio de la fila. Los vacíos
        del final no cuentan: ahí simplemente no llegó nadie.
      </p>

      {error && <p className={`mt-3 ${formErrorBoxClass}`}>{error}</p>}
      {done && (
        <p className="mt-3 rounded-2xl bg-mint-100/70 px-4 py-2.5 text-[13.5px] font-semibold text-mint-500">
          {done}
        </p>
      )}

      {gapPlans.length === 0 ? (
        <Card className="mt-3 p-5">
          <p className="text-sm text-ink-soft">
            No hay huecos en medio de ninguna fila. El acomodo está compacto.
          </p>
        </Card>
      ) : (
        <div className="mt-3 space-y-3">
          {gapPlans.map((plan) => (
            <Card key={plan.gap} className="p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-heading text-base font-bold text-ink">
                  Hueco en el stand #{plan.gap}
                </h3>
                <span className="text-xs font-semibold text-ink-soft">
                  {plan.rowLabel}
                </span>
              </div>

              <div
                className={`mt-3 grid gap-3 ${
                  plan.shiftAll.length > 1 ? "sm:grid-cols-2" : ""
                }`}
              >
                <div className="rounded-2xl bg-mint-100/50 p-3.5">
                  <p className="text-[13px] font-extrabold text-mint-500">
                    Traer al último de la fila
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-ink-soft">
                    1 movimiento. Es el que menos molesta.
                  </p>
                  <ul className="mt-2 space-y-1 text-[13px] text-ink">
                    {plan.pullLast.map((move) => (
                      <li key={move.registrationId}>
                        <strong>{move.businessName}</strong>: #{move.from} → #
                        {move.to}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => apply(plan.pullLast)}
                    className="mt-3 !px-4 !py-1.5 text-xs"
                  >
                    Aplicar
                  </Button>
                </div>

                {/* Con un solo movimiento las dos opciones son la misma:
                    mostrarla dos veces sólo confunde. */}
                {plan.shiftAll.length > 1 && (
                <div className="rounded-2xl bg-lavender-100/50 p-3.5">
                  <p className="text-[13px] font-extrabold text-lavender-500">
                    Recorrer toda la fila
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-ink-soft">
                    {plan.shiftAll.length}{" "}
                    {plan.shiftAll.length === 1 ? "movimiento" : "movimientos"}.
                    Deja la fila pareja, pero mueve a más gente.
                  </p>
                  <ul className="mt-2 max-h-[150px] space-y-1 overflow-y-auto text-[13px] text-ink">
                    {plan.shiftAll.map((move) => (
                      <li key={move.registrationId}>
                        <strong>{move.businessName}</strong>: #{move.from} → #
                        {move.to}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() => apply(plan.shiftAll)}
                    className="mt-3 !px-4 !py-1.5 text-xs"
                  >
                    Aplicar
                  </Button>
                </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="mt-4 p-5">
        <h3 className="font-heading text-base font-bold text-ink">
          Mover un expositor a mano
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1.4fr_1fr_auto] sm:items-end">
          <div>
            <label className={labelClass}>Expositor</label>
            <select
              className={inputClass}
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
            >
              <option value="">Elige uno</option>
              {active
                .slice()
                .sort((a, b) => a.business_name.localeCompare(b.business_name))
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.business_name} (stand {r.stand_id})
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Se mueve al stand</label>
            <select
              className={inputClass}
              value={manualTo}
              onChange={(e) => setManualTo(e.target.value)}
            >
              <option value="">Elige uno libre</option>
              {freeStands.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </div>
          <Button disabled={busy} onClick={applyManual}>
            Mover
          </Button>
        </div>
      </Card>
    </div>
  );
}
