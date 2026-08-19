"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { finalPrice } from "@/lib/discount";
import type { RegistrationRow } from "@/lib/types";

/**
 * Dar de baja a un expositor.
 *
 * Son dos casos distintos y conviene que se vean distintos: una prueba
 * o un duplicado se borran y ya, pero a alguien que pagó hay que
 * devolverle su dinero, y esa devolución tiene que quedar anotada. Si
 * sólo se borrara el registro, el Excel olvidaría que ese dinero entró
 * y salió — y si el evento retuvo una parte, esa parte se perdería con
 * el resto.
 *
 * Por eso, cuando el registro trae dinero reportado, el monto a
 * devolver viene ya escrito y se puede bajar: dejarlo en menos de lo
 * pagado es justamente cómo se anota una penalización.
 */
export function DeleteRegistration({
  registration,
  busy,
  onDelete,
}: {
  registration: RegistrationRow;
  busy: boolean;
  onDelete: (refunded: number | null, note: string) => void;
}) {
  const paid = Number(registration.amount_reported) || 0;
  const [open, setOpen] = useState(false);
  const [refunded, setRefunded] = useState(String(paid));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <Button
        size="md"
        variant="ghost"
        disabled={busy}
        onClick={() => setOpen(true)}
        className="!px-3 !py-1 text-xs !text-danger-600"
      >
        {paid > 0 ? "Eliminar y devolver" : "Eliminar"}
      </Button>
    );
  }

  function confirmRefund() {
    const amount = Number(refunded);
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Escribe cuánto le devolviste.");
      return;
    }
    if (amount > paid) {
      setError(`No puede ser más de los $${paid.toLocaleString("es-MX")} que pagó.`);
      return;
    }
    onDelete(amount, note.trim());
  }

  const kept = paid - (Number(refunded) || 0);

  return (
    <div className="ml-auto w-[230px] rounded-xl bg-danger-50 p-2.5">
      <p className="text-xs font-bold text-danger-600">
        {paid > 0
          ? `Eliminar el folio #${registration.folio_number} y devolverle su dinero`
          : `Eliminar el folio #${registration.folio_number}`}
      </p>
      <p className="mt-0.5 text-[11px] text-danger-600">
        Se libera el stand #{registration.stand_id} y se borran sus comprobantes.
        No se puede deshacer.
      </p>

      {paid > 0 ? (
        <>
          <p className="mt-2 text-[11px] font-semibold text-ink">
            Pagó ${paid.toLocaleString("es-MX")} de ${finalPrice(registration).toLocaleString("es-MX")}.
          </p>
          <label className="mt-1.5 block text-[11px] font-bold text-ink">
            Le devolví
            <input
              type="number"
              min={0}
              max={paid}
              step="0.01"
              value={refunded}
              disabled={busy}
              onChange={(e) => setRefunded(e.target.value)}
              className="mt-0.5 w-full rounded-lg border-2 border-pink-100 bg-white px-2 py-1 font-mono text-xs text-ink focus:border-pink-500 focus:outline-none"
            />
          </label>
          {kept > 0 && (
            <p className="mt-1 text-[11px] text-ink-soft">
              El evento retiene ${kept.toLocaleString("es-MX")}.
            </p>
          )}
          <input
            placeholder="Nota (opcional)"
            value={note}
            disabled={busy}
            onChange={(e) => setNote(e.target.value)}
            maxLength={300}
            className="mt-1.5 w-full rounded-lg border-2 border-pink-100 bg-white px-2 py-1 text-[11px] text-ink focus:border-pink-500 focus:outline-none"
          />
          {error && (
            <p className="mt-1 text-[11px] font-bold text-danger-600">{error}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Button
              size="md"
              variant="danger"
              disabled={busy}
              onClick={confirmRefund}
              className="!px-3 !py-1 text-xs"
            >
              Eliminar y anotar
            </Button>
            <Button
              size="md"
              variant="ghost"
              disabled={busy}
              onClick={() => setOpen(false)}
              className="!px-3 !py-1 text-xs"
            >
              Cancelar
            </Button>
          </div>
          {/* Para los registros de prueba: no hubo dinero de verdad, así
              que anotar una devolución ensuciaría las cuentas. */}
          <button
            type="button"
            disabled={busy}
            onClick={() => onDelete(null, "")}
            className="mt-2 text-[11px] text-ink-soft underline underline-offset-2 hover:text-danger-600"
          >
            Era una prueba: eliminar sin anotar dinero
          </button>
        </>
      ) : (
        <div className="mt-2 flex gap-2">
          <Button
            size="md"
            variant="danger"
            disabled={busy}
            onClick={() => onDelete(null, "")}
            className="!px-3 !py-1 text-xs"
          >
            Sí, eliminar
          </Button>
          <Button
            size="md"
            variant="ghost"
            disabled={busy}
            onClick={() => setOpen(false)}
            className="!px-3 !py-1 text-xs"
          >
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
}
