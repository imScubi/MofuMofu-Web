"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
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

  // La casilla de aceptación solo se habilita después de que el
  // expositor llegó al final del reglamento, para que la aceptación sea
  // una lectura real y no un clic a ciegas.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function checkScroll() {
      if (!el) return;
      const reachedEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 24;
      if (reachedEnd) setScrolledToEnd(true);
    }

    checkScroll();
    el.addEventListener("scroll", checkScroll);
    return () => el.removeEventListener("scroll", checkScroll);
  }, []);

  return (
    <Card className="mt-6 space-y-5 p-6">
      <div>
        <h2 className="font-heading text-xl font-bold text-ink">
          Reglamento para expositores
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Léelo completo antes de continuar. Al aceptarlo quedas de acuerdo con
          todas sus disposiciones.
        </p>
      </div>

      <div
        ref={scrollRef}
        className="kawaii-scroll max-h-80 overflow-y-auto rounded-2xl border border-pink-100 bg-pink-50/40 p-5 text-sm"
      >
        {REGLAMENTO.map((section) => (
          <section key={section.title} className="mb-5 last:mb-0">
            <h3 className="font-heading font-bold text-ink">{section.title}</h3>
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
          <p className="font-semibold text-ink">Contacto del staff</p>
          {STAFF_CONTACTS.map((c) => (
            <p key={c.phone}>
              {c.name} — {c.phone}
            </p>
          ))}
        </div>
      </div>

      {!scrolledToEnd && (
        <p className="text-center text-xs text-ink-soft">
          Desplázate hasta el final del reglamento para poder aceptarlo ⬆️
        </p>
      )}

      <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl bg-pink-50 p-4">
        <input
          type="checkbox"
          checked={reglamentoAccepted}
          disabled={!scrolledToEnd}
          onChange={(e) => onReglamentoAcceptedChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-pink-300 text-pink-500 focus:ring-pink-300 disabled:opacity-40"
        />
        <span className="text-sm font-semibold text-ink">
          He leído y acepto en su totalidad el reglamento para expositores de
          MOFU MOFU MARKET.
        </span>
      </label>

      {showRestrictedGiros && (
        <div className="space-y-3">
          <div>
            <h3 className="font-heading text-lg font-bold text-ink">
              Giros restringidos para esta edición
            </h3>
            <p className="mt-1 text-sm text-ink-soft">
              Los siguientes giros están restringidos en esta fecha. Revisarlos
              es responsabilidad del expositor (cláusula 8.8 del reglamento).
            </p>
          </div>

          <div className="rounded-2xl border border-amber-300 bg-amber-100/50 p-4">
            <ul className="grid gap-1.5 text-sm text-ink sm:grid-cols-2">
              {RESTRICTED_GIROS.map((giro) => (
                <li key={giro}>• {giro}</li>
              ))}
            </ul>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl bg-amber-100/50 p-4">
            <input
              type="checkbox"
              checked={girosAccepted}
              onChange={(e) => onGirosAcceptedChange(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-amber-300 text-pink-500 focus:ring-amber-300"
            />
            <span className="text-sm font-semibold text-ink">
              Leí la lista de giros restringidos y estoy consciente de que, si
              llevo un giro restringido, puedo ser acreedor a una multa u otras
              sanciones, y que se me puede solicitar retirar el producto,
              conforme a la cláusula 8.8 del reglamento.
            </span>
          </label>
        </div>
      )}
    </Card>
  );
}
