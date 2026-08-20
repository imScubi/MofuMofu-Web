"use client";

import { useState } from "react";
import clsx from "clsx";
import { EVENT_CONFIG } from "@/lib/eventConfig";

/**
 * A dónde transferir.
 *
 * Vive en su propio componente porque hace falta en dos momentos: al
 * registrarse y al volver a completar el pago. Cuando cambia la cuenta
 * —y ya cambió una vez— tener los datos en un solo lugar es lo que evita
 * que una pantalla siga mostrando la CLABE vieja y el dinero acabe donde
 * no debe.
 */
export function BankDetails({ className }: { className?: string }) {
  return (
    <div className={clsx("rounded-2xl bg-lavender-100/70 p-4", className)}>
      <p className="text-[11.5px] font-extrabold uppercase tracking-[0.12em] text-lavender-500">
        Datos para transferir
      </p>
      <dl className="mt-2 space-y-2">
        <BankRow label="Banco" value={EVENT_CONFIG.bankInfo.bank} />
        <BankRow label="Titular" value={EVENT_CONFIG.bankInfo.accountHolder} />
        <BankRow label="CLABE" value={EVENT_CONFIG.bankInfo.clabe} mono copyable />
        <BankRow label="Tarjeta" value={EVENT_CONFIG.bankInfo.cardNumber} mono copyable />
        <BankRow label="Concepto" value={EVENT_CONFIG.bankInfo.concept} />
      </dl>
    </div>
  );
}

function BankRow({
  label,
  value,
  mono,
  copyable,
}: {
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      // Sin espacios: es lo que espera la app del banco al pegarlo.
      await navigator.clipboard.writeText(value.replace(/\s/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // El valor sigue visible aunque el portapapeles falle.
    }
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-soft">
          {label}
        </dt>
        <dd
          className={clsx(
            "break-words text-[14px] text-ink",
            mono ? "font-mono" : "font-semibold"
          )}
        >
          {value}
        </dd>
      </div>
      {copyable && (
        <button
          type="button"
          onClick={copy}
          aria-label={`Copiar ${label}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lavender-500 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lavender-300"
        >
          {copied ? (
            <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
              <path
                d="M3.2 8.6l3 3L12.8 5"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
              <rect
                x="5.5"
                y="5.5"
                width="7.5"
                height="8.5"
                rx="1.8"
                stroke="currentColor"
                strokeWidth={1.5}
              />
              <path
                d="M10.2 3.5H4.8c-.9 0-1.6.7-1.6 1.6v5.3"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
