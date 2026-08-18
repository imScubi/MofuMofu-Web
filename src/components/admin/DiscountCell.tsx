"use client";

import { useState } from "react";
import { describeDiscount } from "@/lib/discount";
import type { RegistrationRow } from "@/lib/types";

/**
 * El descuento interno de un registro, editable en su renglón.
 *
 * No pide motivo a propósito: es una decisión del organizador y anotarla
 * aquí sólo serviría para que apareciera en un documento donde no debe.
 * Lo que sí importa es que quede claro que el precio de lista no cambió.
 */
export function DiscountCell({
  registration,
  onSave,
}: {
  registration: RegistrationRow;
  onSave: (
    discountType: "percent" | "amount" | null,
    discountValue: number
  ) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"percent" | "amount" | "">(
    registration.discount_type ?? ""
  );
  const [value, setValue] = useState(
    registration.discount_value ? String(registration.discount_value) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = describeDiscount(registration);

  async function save(
    nextType: "percent" | "amount" | "",
    nextValue: string
  ) {
    const amount = Number(nextValue);
    if (nextType && (!Number.isFinite(amount) || amount <= 0)) {
      setError("Escribe cuánto.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(nextType || null, nextType ? amount : 0);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se guardó.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`mt-1 rounded-full px-2 py-0.5 text-[11px] font-bold transition-colors ${
          current
            ? "bg-lavender-100 text-lavender-500 hover:bg-lavender-100/70"
            : "text-ink-soft underline underline-offset-2 hover:text-pink-700"
        }`}
      >
        {current ? `Descuento ${current}` : "Aplicar descuento"}
      </button>
    );
  }

  return (
    <div className="mt-1 w-[168px] rounded-xl bg-lavender-100/50 p-2">
      <div className="flex gap-1">
        <select
          aria-label="Tipo de descuento"
          value={type}
          disabled={saving}
          onChange={(e) => setType(e.target.value as "percent" | "amount" | "")}
          className="min-w-0 flex-1 rounded-lg border-2 border-pink-100 bg-white px-1.5 py-1 text-[11px] font-semibold text-ink focus:border-pink-500 focus:outline-none"
        >
          <option value="">Sin descuento</option>
          <option value="percent">%</option>
          <option value="amount">$</option>
        </select>
        <input
          type="number"
          min={0}
          aria-label="Cantidad del descuento"
          value={value}
          disabled={saving || !type}
          onChange={(e) => setValue(e.target.value)}
          className="w-[56px] rounded-lg border-2 border-pink-100 bg-white px-1.5 py-1 text-[11px] font-semibold text-ink focus:border-pink-500 focus:outline-none disabled:opacity-50"
        />
      </div>

      {error && <p className="mt-1 text-[11px] font-bold text-danger-600">{error}</p>}

      <div className="mt-1.5 flex gap-1">
        <button
          type="button"
          disabled={saving}
          onClick={() => save(type, value)}
          className="rounded-lg bg-pink-500 px-2 py-1 text-[11px] font-bold text-white disabled:opacity-50"
        >
          {saving ? "..." : "Guardar"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => {
            setType(registration.discount_type ?? "");
            setValue(
              registration.discount_value ? String(registration.discount_value) : ""
            );
            setError(null);
            setOpen(false);
          }}
          className="rounded-lg px-2 py-1 text-[11px] font-bold text-ink-soft"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
