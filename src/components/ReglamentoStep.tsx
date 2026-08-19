"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Character } from "@/components/ui/Character";
import { Checkbox } from "@/components/ui/Checkbox";
import { REGLAMENTO, RESTRICTED_GIROS, STAFF_CONTACTS } from "@/lib/reglamento";

interface ReglamentoStepProps {
  showRestrictedGiros: boolean;
  reglamentoAccepted: boolean;
  onReglamentoAcceptedChange: (accepted: boolean) => void;
  girosAccepted: boolean;
  onGirosAcceptedChange: (accepted: boolean) => void;
}

export function ReglamentoStep({
  showRestrictedGiros,
  reglamentoAccepted,
  onReglamentoAcceptedChange,
  girosAccepted,
  onGirosAcceptedChange,
}: ReglamentoStepProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  const [progress, setProgress] = useState(0);

  // La casilla de aceptación solo se habilita después de que el
  // expositor llegó al final del reglamento, para que la aceptación sea
  // una lectura real y no un clic a ciegas.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function checkScroll() {
      if (!el) return;
      const max = el.scrollHeight - el.clientHeight;
      setProgress(max <= 0 ? 1 : Math.min(1, el.scrollTop / max));
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
        setScrolledToEnd(true);
      }
    }

    checkScroll();
    el.addEventListener("scroll", checkScroll);
    return () => el.removeEventListener("scroll", checkScroll);
  }, []);

  return (
    <Card className="mt-6 space-y-5 p-5 sm:p-8">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-2xl font-bold leading-[1.15] text-ink">
            Reglamento para expositores
          </h2>
          <p className="mt-1.5 text-[13.5px] leading-[1.55] text-ink-soft">
            Léelo completo antes de continuar. Al aceptarlo quedas de acuerdo con
            todas sus disposiciones.
          </p>
        </div>
        <Character name="hanzo" size={78} className="hidden shrink-0 sm:block" />
      </div>

      <div>
        {/* Barra de progreso de lectura: deja ver cuánto falta. */}
        <div
          className="h-1.5 overflow-hidden rounded-full bg-pink-100"
          role="progressbar"
          aria-label="Progreso de lectura del reglamento"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-pink-500 transition-[width] duration-150"
            style={{ width: `${Math.max(4, progress * 100)}%` }}
          />
        </div>

        <div
          ref={scrollRef}
          tabIndex={0}
          className="kawaii-scroll mt-2 max-h-[min(60vh,420px)] min-h-[340px] overflow-y-auto rounded-2xl border-2 border-pink-100 bg-pink-50/50 p-4 text-[15px] leading-[1.7] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pink-100 sm:p-5 sm:text-base sm:leading-[1.75]"
        >
          <div className="max-w-[72ch]">
            {REGLAMENTO.map((section) => (
              <section key={section.title} className="mb-5 last:mb-0">
                <h3 className="font-heading text-lg font-bold text-ink">
                  {section.title}
                </h3>
                <ul className="mt-2 space-y-2">
                  {section.items.map((item) => (
                    <li key={item} className="text-ink-soft">
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            <div className="mt-4 border-t border-pink-100 pt-3 text-ink-soft">
              <p className="font-bold text-ink">Contacto del staff</p>
              {STAFF_CONTACTS.map((c) => (
                <p key={c.phone}>
                  {c.name} — <span className="font-mono">{c.phone}</span>
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Checkbox
        checked={reglamentoAccepted}
        disabled={!scrolledToEnd}
        disabledHint="Se activa cuando llegues al final del reglamento"
        onChange={(e) => onReglamentoAcceptedChange(e.target.checked)}
      >
        He leído y acepto en su totalidad el reglamento para expositores de MOFU
        MOFU MARKET.
      </Checkbox>

      {showRestrictedGiros && (
        <div className="space-y-3">
          <div>
            <h3 className="font-heading text-lg font-bold text-ink">
              Giros restringidos para esta edición
            </h3>
            <p className="mt-1 text-[13.5px] leading-[1.55] text-ink-soft">
              Los siguientes giros están restringidos en esta fecha. Revisarlos
              es responsabilidad del expositor (cláusula 8.8 del reglamento).
            </p>
          </div>

          <div className="rounded-2xl border-2 border-amber-300 bg-amber-100/60 p-4">
            <ul className="grid gap-1.5 text-[14.5px] text-ink sm:grid-cols-2">
              {RESTRICTED_GIROS.map((giro) => (
                <li key={giro} className="flex gap-2">
                  <span aria-hidden="true" className="text-amber-500">
                    •
                  </span>
                  {giro}
                </li>
              ))}
            </ul>
          </div>

          <Checkbox
            checked={girosAccepted}
            onChange={(e) => onGirosAcceptedChange(e.target.checked)}
          >
            Leí la lista de giros restringidos y estoy consciente de que, si
            llevo un giro restringido, puedo ser acreedor a una multa u otras
            sanciones, y que se me puede solicitar retirar el producto, conforme
            a la cláusula 8.8 del reglamento.
          </Checkbox>
        </div>
      )}
    </Card>
  );
}
