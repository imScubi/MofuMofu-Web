"use client";

import { useRef, useState } from "react";
import clsx from "clsx";

/**
 * Un texto que se corrige en su lugar.
 *
 * Se ve como el título o el dato que ya estaba, no como un campo de
 * formulario: sólo al pasar el cursor o enfocarlo aparece el borde. La
 * idea es arreglar una falta de ortografía en dos clics, sin borrar y
 * volver a crear la edición o la convocatoria.
 *
 * Guarda al salir del campo y sólo si cambió algo. Escape cancela y
 * devuelve el valor original — un arrepentimiento a media edición no
 * debería quedar guardado.
 */
export function InlineEdit({
  value,
  onSave,
  placeholder,
  multiline,
  className,
  inputType = "text",
  ariaLabel,
  disabled,
}: {
  value: string;
  onSave: (value: string) => Promise<void> | void;
  placeholder?: string;
  multiline?: boolean;
  /** Clases para que el campo herede el tamaño del texto que reemplaza. */
  className?: string;
  inputType?: "text" | "date" | "time";
  ariaLabel: string;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  // Escape revierte y saca el foco, pero el blur llega antes de que
  // React tenga el valor revertido: sin esta bandera, cancelar
  // terminaría guardando justo lo que se quiso descartar.
  const cancelling = useRef(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);

  // Si el valor cambia desde fuera (un refresh del servidor), el campo
  // se pone al día, salvo mientras se está guardando.
  const [synced, setSynced] = useState(value);
  if (value !== synced && !saving) {
    setSynced(value);
    setDraft(value);
  }

  async function commit() {
    if (cancelling.current) {
      cancelling.current = false;
      setDraft(value);
      return;
    }

    const next = draft.trim();
    if (next === value.trim()) return;
    if (!next && inputType === "text" && !multiline) {
      // Un nombre vacío deja la tarjeta sin identidad: se revierte.
      setDraft(value);
      return;
    }

    setSaving(true);
    setError(false);
    try {
      await onSave(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch {
      setError(true);
      setDraft(value);
    } finally {
      setSaving(false);
    }
  }

  const shared = clsx(
    "w-full rounded-xl border-2 border-transparent bg-transparent px-2 py-1",
    "transition-colors hover:border-pink-100 focus:border-pink-500 focus:bg-white focus:outline-none",
    "disabled:opacity-50",
    error && "border-danger-600",
    className
  );

  return (
    <span className="relative block">
      {multiline ? (
        <textarea
          aria-label={ariaLabel}
          value={draft}
          rows={2}
          placeholder={placeholder}
          disabled={disabled || saving}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              cancelling.current = true;
              setDraft(value);
              e.currentTarget.blur();
            }
          }}
          className={shared}
        />
      ) : (
        <input
          type={inputType}
          aria-label={ariaLabel}
          value={draft}
          placeholder={placeholder}
          disabled={disabled || saving}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              cancelling.current = true;
              setDraft(value);
              e.currentTarget.blur();
            }
          }}
          className={shared}
        />
      )}

      {(saving || saved || error) && (
        <span
          role="status"
          className={clsx(
            "pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-2 py-0.5 text-[11px] font-bold",
            error
              ? "bg-danger-50 text-danger-600"
              : saved
                ? "bg-mint-100 text-mint-500"
                : "bg-pink-50 text-pink-700"
          )}
        >
          {error ? "No se guardó" : saved ? "Guardado" : "Guardando…"}
        </span>
      )}
    </span>
  );
}
