import clsx from "clsx";
import { EVENT_CONFIG } from "@/lib/eventConfig";
import { parsePrizeCategories } from "@/lib/contestRegulation";
import type { ContestRow } from "@/lib/types";

/**
 * Cuánto cuesta entrarle.
 *
 * El precio estaba sólo dentro del reglamento, que es un documento largo
 * que casi nadie abre antes de llenar el formulario. Aquí sale antes que
 * nada: nadie debería descubrir la cuota hasta el final.
 *
 * Sale de las mismas categorías que el reglamento, así que no hay forma
 * de que digan cosas distintas. Si el concurso todavía no tiene premios
 * configurados no se inventa nada — no se muestra.
 */

const money = (amount: number) =>
  `$${amount.toLocaleString("es-MX")} ${EVENT_CONFIG.currency}`;

export function ContestFees({
  contest,
  className,
  compact,
}: {
  contest: ContestRow;
  className?: string;
  /** Versión de una línea, para las tarjetas del listado. */
  compact?: boolean;
}) {
  const categories = parsePrizeCategories(contest.prize_categories);
  if (categories.length === 0) return null;

  const fees = categories.map((category) => category.entryFee);
  const gratis = fees.every((fee) => fee <= 0);
  // Varias categorías al mismo precio se dicen una sola vez: "Grupal $50
  // · Individual $50" es ruido cuando basta con "$50".
  const mismoPrecio = new Set(fees).size === 1;

  if (compact) {
    return (
      <span
        className={clsx(
          "rounded-full bg-pink-50 px-3 py-1 text-[12.5px] font-bold text-pink-700",
          className
        )}
      >
        {gratis
          ? "Entrada gratis"
          : mismoPrecio
            ? `Inscripción ${money(fees[0])}`
            : `Inscripción desde ${money(Math.min(...fees))}`}
      </span>
    );
  }

  return (
    <div
      className={clsx(
        "rounded-2xl border-2 border-pink-300 bg-pink-50 px-4 py-3.5",
        className
      )}
    >
      <p className="text-[11.5px] font-extrabold uppercase tracking-[0.12em] text-pink-700">
        {gratis ? "Entrada" : "Costo de inscripción"}
      </p>

      {gratis ? (
        <p className="mt-0.5 font-heading text-[26px] font-extrabold leading-tight text-ink">
          Gratis
        </p>
      ) : mismoPrecio ? (
        <p className="mt-0.5 font-heading text-[30px] font-extrabold leading-tight text-ink">
          ${fees[0].toLocaleString("es-MX")}
          <span className="ml-1.5 font-body text-sm font-bold text-ink-soft">
            {EVENT_CONFIG.currency}
          </span>
        </p>
      ) : (
        <dl className="mt-1.5 space-y-1.5">
          {categories.map((category) => (
            <div
              key={category.label}
              className="flex items-baseline justify-between gap-3 border-b border-pink-100 pb-1.5 last:border-0 last:pb-0"
            >
              <dt className="text-[14px] font-semibold text-ink">{category.label}</dt>
              <dd className="font-heading text-[19px] font-extrabold leading-none text-ink">
                {category.entryFee > 0 ? (
                  <>
                    ${category.entryFee.toLocaleString("es-MX")}
                    <span className="ml-1 font-body text-[11px] font-bold text-ink-soft">
                      {EVENT_CONFIG.currency}
                    </span>
                  </>
                ) : (
                  "Gratis"
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {!gratis && (
        <p className="mt-2 text-[13px] leading-[1.5] text-ink-soft">
          Se paga al confirmar tu lugar. Te escribimos por WhatsApp con los datos.
        </p>
      )}
    </div>
  );
}
