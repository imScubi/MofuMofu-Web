"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { formatEventDates } from "@/lib/formatDates";
import { EVENT_CONFIG } from "@/lib/eventConfig";
import type { EventRow } from "@/lib/types";

interface ConfirmationTicketProps {
  folio: number | null;
  standId: string | null;
  event: EventRow | null;
}

/**
 * El folio es el dato que la persona necesita después para completar su
 * pago, así que es lo más grande de la pantalla y se ve como un boleto:
 * en una captura de pantalla se distingue a la primera.
 */
export function ConfirmationTicket({ folio, standId, event }: ConfirmationTicketProps) {
  const [copied, setCopied] = useState(false);

  async function copyFolio() {
    if (folio == null) return;
    try {
      await navigator.clipboard.writeText(String(folio));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Si el navegador bloquea el portapapeles, el número sigue visible.
    }
  }

  // El mensaje va sin destinatario: wa.me sin número abre WhatsApp con
  // el texto listo para que la persona escoja el chat.
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    [
      `Mi folio de ${EVENT_CONFIG.name} es ${folio}`,
      standId ? `Stand #${standId}` : null,
      event ? event.name : null,
      "Lo necesito para completar mi pago.",
    ]
      .filter(Boolean)
      .join(" · ")
  )}`;

  const deadline = event
    ? new Date(event.payment_deadline + "T00:00:00").toLocaleDateString("es-MX", {
        day: "numeric",
        month: "long",
      })
    : null;

  return (
    <div className="mofu-confetti mx-auto max-w-[420px] overflow-hidden rounded-[26px] border border-pink-100 bg-pink-50 px-4 py-6 shadow-[0_24px_50px_-30px_rgba(58,43,51,0.5)] sm:max-w-lg sm:px-6">
      <Image
        src="/char-mofu.webp"
        alt=""
        aria-hidden="true"
        width={600}
        height={879}
        className="mofu-float mx-auto -mb-1.5 h-auto w-[112px]"
        priority
      />
      <h2 className="text-center font-heading text-[27px] font-extrabold leading-[1.1] text-ink">
        ¡Tu lugar quedó apartado!
      </h2>
      {standId && event && (
        <p className="mt-2 text-center text-[14.5px] leading-[1.6] text-ink-soft">
          Stand <strong className="text-pink-700">#{standId}</strong> en {event.name}
          <span className="block">{formatEventDates(event.date_start, event.date_end)}</span>
        </p>
      )}

      {folio != null && (
        <div className="mofu-ticket mt-[18px] rounded-[22px] border-2 border-dashed border-pink-300 bg-white px-4 py-5 text-center">
          <p className="text-[11.5px] font-extrabold uppercase tracking-[0.14em] text-pink-700">
            Guarda tu folio
          </p>
          <p className="mt-1.5 font-mono text-[40px] font-medium leading-none tracking-[0.06em] text-pink-700 sm:text-[52px]">
            #{folio}
          </p>
          <p className="mt-2.5 text-[13px] font-semibold leading-[1.5] text-ink-soft">
            Guárdalo con el botón de abajo o toma captura. Lo necesitas para
            completar tu pago después.
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={copyFolio}
            className="mt-3.5 w-full"
          >
            {copied ? (
              <>
                <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path
                    d="M3.2 8.6l3 3L12.8 5"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Folio copiado
              </>
            ) : (
              <>
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
                Copiar folio
              </>
            )}
          </Button>

          {/* Mandárselo por WhatsApp sin depender de ningún proveedor:
              se abre la app con el mensaje ya escrito y la persona
              elige a quién enviárselo, que suele ser a sí misma. */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-full border-2 border-mint-500 px-4 py-2.5 text-[15px] font-bold text-mint-500 transition-colors hover:bg-mint-100"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
              <path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 2a8 8 0 110 16 8 8 0 01-4.2-1.2l-.3-.2-2.5.7.7-2.4-.2-.3A8 8 0 0112 4zm-3.4 4c-.2 0-.4 0-.6.3-.2.3-.8.8-.8 1.9s.8 2.2.9 2.3c.1.2 1.6 2.5 4 3.4 2 .8 2.4.6 2.8.6.4 0 1.3-.5 1.5-1.1.2-.6.2-1 .1-1.1l-.5-.3-1.4-.7c-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1-.2-.1-1-.4-1.9-1.2-.7-.6-1.2-1.4-1.3-1.6-.1-.2 0-.3.1-.4l.4-.5.2-.4v-.4l-.7-1.6c-.2-.4-.4-.4-.5-.4h-.6z" />
            </svg>
            Guardarlo en WhatsApp
          </a>
        </div>
      )}

      <div className="mt-[18px] rounded-[22px] border border-pink-100 bg-white p-[18px]">
        <p className="mb-3 font-heading text-base font-bold text-ink">Qué sigue</p>
        <div className="flex items-start gap-3 border-b border-pink-50 pb-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pink-50 font-mono text-[13px] text-pink-700">
            1
          </span>
          <p className="text-sm leading-[1.55] text-ink-soft">
            Revisamos tu comprobante a mano. Te escribimos por WhatsApp o correo.
          </p>
        </div>
        <div className="flex items-start gap-3 pt-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 font-mono text-[13px] text-amber-500">
            2
          </span>
          <p className="text-sm leading-[1.55] text-ink-soft">
            Si pagaste sólo un anticipo, completa el resto
            {deadline && (
              <>
                {" "}
                antes del <strong className="text-amber-500">{deadline}</strong>
              </>
            )}{" "}
            con tu folio.
          </p>
        </div>
      </div>

      <Link href="/registro/completar" className="mt-3.5 block">
        <Button className="w-full">Completar mi pago</Button>
      </Link>
      {/* Sin esta salida la pantalla del folio es un callejón: la única
          forma de volver era el botón atrás del navegador. */}
      <Link href="/" className="mt-2 block">
        <Button variant="ghost" className="w-full">
          Volver al inicio
        </Button>
      </Link>
    </div>
  );
}
