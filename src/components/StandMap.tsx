"use client";

import { CSSProperties, useEffect, useState } from "react";
import Image from "next/image";
import clsx from "clsx";
import { createClient } from "@/lib/supabase/client";
import {
  MAP_IMAGE_HEIGHT,
  MAP_IMAGE_SRC,
  MAP_IMAGE_WIDTH,
  STAND_LAYOUT,
} from "@/lib/standLayout";
import type { EventStandRow, StandStatus } from "@/lib/types";
import type { StandFit } from "@/lib/standAvailability";

interface StandMapProps {
  eventId: string;
  initialStands: EventStandRow[];
  selectedId: string | null;
  onSelect: (standId: string) => void;
  /**
   * Lugares que existen y están libres, pero que no le tocan a quien
   * está eligiendo (son de otra zona, o su zona ya llegó al tope). El
   * mapa no sabe de zonas: sólo pregunta.
   */
  isLocked?: (standId: string) => boolean;
  /**
   * Cómo le queda cada stand a quien está eligiendo. El mapa tampoco
   * sabe de días ni de espacios compartidos: pregunta y pinta.
   */
  fitFor?: (standId: string) => StandFit | null;
}

// Los cuatro estados se distinguen SIN color, para daltonismo:
//   disponible    → relleno claro + el número
//   en proceso    → franjas diagonales
//   apartado      → relleno sólido + palomita
//   no disponible → trama cruzada + tache
// Además se separan en luminosidad: disponible es el único claro y
// apartado el único sólido.
const STRIPES_PENDING =
  "repeating-linear-gradient(45deg, var(--color-amber-100) 0 4px, var(--color-amber-300) 4px 7px)";
const STRIPES_BLOCKED =
  "repeating-linear-gradient(135deg, rgba(107,97,105,.18) 0 3px, rgba(107,97,105,.42) 3px 6px)";

interface StatusStyle {
  className: string;
  style?: CSSProperties;
  label: string;
}

const STATUS_STYLES: Record<StandStatus, StatusStyle> = {
  available: {
    className: "bg-mint-300/55 ring-2 ring-mint-500 text-mint-500",
    label: "Disponible",
  },
  pending: {
    className: "ring-2 ring-amber-500 text-amber-500",
    style: { backgroundImage: STRIPES_PENDING },
    label: "En proceso de pago",
  },
  sold: {
    className: "bg-pink-600 ring-2 ring-pink-700 text-white",
    label: "Apartado",
  },
  blocked: {
    className: "ring-2 ring-gray-500/65 text-gray-500",
    style: { backgroundImage: STRIPES_BLOCKED },
    label: "No disponible",
  },
};

function CheckGlyph() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-[62%] w-[62%]" aria-hidden="true">
      <path
        d="M3.2 8.6l3 3L12.8 5"
        stroke="currentColor"
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CrossGlyph() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-[52%] w-[52%]" aria-hidden="true">
      <path
        d="M4 4l8 8M12 4l-8 8"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </svg>
  );
}

function LockGlyph() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-[58%] w-[58%]" aria-hidden="true">
      <rect x={3.4} y={7} width={9.2} height={6} rx={1.6} fill="currentColor" />
      <path
        d="M5.6 7V5.4a2.4 2.4 0 014.8 0V7"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Libre sólo para el día que pediste: alguien más lo tiene el otro día.
 * Se distingue con la marca "1d", no sólo con el color.
 */
const PARTIAL_STYLE: StatusStyle = {
  className: "bg-amber-100 ring-2 ring-amber-500 text-amber-500",
  label: "Libre sólo tu día",
};

/** Queda medio lugar: lo compartirías con otro negocio. */
const SHARED_STYLE: StatusStyle = {
  className: "bg-lavender-100 ring-2 ring-lavender-500 text-lavender-500",
  label: "Compartido, queda lugar",
};

/** Lugar libre que no le toca a este plan: se ve apartado, no roto. */
const LOCKED_STYLE: StatusStyle = {
  className: "bg-lavender-100/70 border-2 border-dashed border-lavender-500 text-lavender-500",
  label: "No disponible para tu plan",
};

/** Media luna: el stand está partido entre dos negocios. */
function HalfGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="h-[62%] w-[62%]" aria-hidden="true">
      <circle cx="8" cy="8" r="5.4" fill="none" stroke="currentColor" strokeWidth={1.7} />
      <path d="M8 2.6a5.4 5.4 0 000 10.8z" fill="currentColor" />
    </svg>
  );
}

/** El glifo que va dentro del cuadro del stand, por estado. */
function standGlyph(status: StandStatus, id: string) {
  if (status === "sold") return <CheckGlyph />;
  if (status === "blocked") return <CrossGlyph />;
  if (status === "pending") return <span className="leading-none">•</span>;
  return <span className="leading-none">{id}</span>;
}

const LEGEND_ITEMS: StandStatus[] = ["available", "pending", "sold", "blocked"];

/** Muestra del estado real, para que la leyenda enseñe lo mismo que el mapa. */
function LegendSwatch({ status }: { status: StandStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={clsx(
        "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] text-[11px] font-bold",
        style.className
      )}
      style={style.style}
      aria-hidden="true"
    >
      {status === "available" ? "12" : standGlyph(status, "")}
    </span>
  );
}

export function StandMap({
  eventId,
  initialStands,
  selectedId,
  onSelect,
  isLocked,
  fitFor,
}: StandMapProps) {
  const [stands, setStands] = useState<Record<string, EventStandRow>>(() =>
    Object.fromEntries(initialStands.map((s) => [s.stand_id, s]))
  );

  const [syncedStands, setSyncedStands] = useState(initialStands);
  if (initialStands !== syncedStands) {
    setSyncedStands(initialStands);
    setStands(Object.fromEntries(initialStands.map((s) => [s.stand_id, s])));
  }

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`event-stands-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "event_stands",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const updated = payload.new as EventStandRow;
          setStands((prev) => ({ ...prev, [updated.stand_id]: updated }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  // Las leyendas sólo aparecen cuando hay algo que explicar: enseñar un
  // estado que no está en el mapa confunde más de lo que ayuda.
  const fitCount = (kind: StandFit["kind"]) =>
    fitFor
      ? STAND_LAYOUT.filter(
          (stand) => stand.reservable && fitFor(stand.id)?.kind === kind
        ).length
      : 0;
  const partialCount = fitCount("parcial");
  const sharedCount = fitCount("compartido");

  const lockedCount = isLocked
    ? STAND_LAYOUT.filter(
        (stand) =>
          stand.reservable &&
          (stands[stand.id]?.status ?? "available") === "available" &&
          isLocked(stand.id)
      ).length
    : 0;

  return (
    <div>
      <div className="kawaii-scroll overflow-x-auto rounded-3xl bg-mint-100/60 p-2.5">
        {/* La proporción y el object-contain NO se tocan: las posiciones
            de los stands son porcentajes sobre esta caja. */}
        <div
          className="relative mx-auto min-w-[860px]"
          style={{ aspectRatio: `${MAP_IMAGE_WIDTH} / ${MAP_IMAGE_HEIGHT}` }}
        >
          <Image
            src={MAP_IMAGE_SRC}
            alt="Plano del evento"
            fill
            sizes="(max-width: 768px) 100vw, 900px"
            className="select-none rounded-2xl object-contain opacity-[0.62] grayscale contrast-[0.85] mix-blend-multiply"
            priority
          />

          {STAND_LAYOUT.map((stand) => {
            const data = stands[stand.id];
            const status: StandStatus = data?.status ?? "available";
            const position: CSSProperties = {
              left: `${(stand.x / MAP_IMAGE_WIDTH) * 100}%`,
              top: `${(stand.y / MAP_IMAGE_HEIGHT) * 100}%`,
              width: `${(stand.size / MAP_IMAGE_WIDTH) * 100}%`,
              height: `${(stand.size / MAP_IMAGE_HEIGHT) * 100}%`,
            };

            if (stand.shape === "info") {
              return (
                <div
                  key={stand.id}
                  title="Módulo de informes"
                  className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-lavender-100 font-heading text-[11px] font-extrabold text-lavender-500 ring-2 ring-lavender-500"
                  style={position}
                >
                  i
                </div>
              );
            }

            // El candado sólo tiene sentido sobre un lugar que de otro
            // modo se podría elegir: si ya está apartado, lo que manda
            // es su estado real.
            const locked = status === "available" && Boolean(isLocked?.(stand.id));
            // La ocupación por día manda sobre el resumen: un stand
            // puede figurar "available" y aun así no admitir a quien
            // está eligiendo, o al revés — figurar ocupado y tener el
            // domingo libre.
            const fit = !locked ? (fitFor?.(stand.id) ?? null) : null;
            const blockedByFit = fit?.kind === "ocupado";

            const style = locked
              ? LOCKED_STYLE
              : fit?.kind === "parcial"
                ? PARTIAL_STYLE
                : fit?.kind === "compartido"
                  ? SHARED_STYLE
                  : blockedByFit
                    ? STATUS_STYLES[status === "available" ? "sold" : status]
                    : STATUS_STYLES[status];

            const isSelectable =
              stand.reservable &&
              status !== "blocked" &&
              !locked &&
              (fit ? fit.kind !== "ocupado" : status === "available");
            const isSelected = selectedId === stand.id;

            return (
              <button
                key={stand.id}
                type="button"
                aria-label={`Stand ${stand.id}, ${style.label.toLowerCase()}`}
                title={fit?.kind === "ocupado" ? fit.reason : style.label}
                aria-pressed={isSelected}
                disabled={!isSelectable}
                onClick={() => onSelect(stand.id)}
                className={clsx(
                  "absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[7px] text-[11px] font-bold transition-all duration-150",
                  // Área táctil invisible: el cuadro no puede crecer sin
                  // desalinearse del plano, pero el dedo sí necesita margen.
                  "after:absolute after:inset-[-9px] after:content-['']",
                  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pink-300",
                  isSelectable ? "cursor-pointer" : "cursor-not-allowed",
                  isSelectable && !isSelected && "hover:bg-mint-300/80 hover:ring-[3px]",
                  isSelected
                    ? "z-10 scale-[1.18] bg-pink-500 text-white ring-[3px] ring-pink-700 shadow-[0_0_0_4px_var(--color-pink-100)]"
                    : style.className
                )}
                style={{ ...position, ...(isSelected ? undefined : style.style) }}
              >
                {isSelected ? (
                  stand.id
                ) : locked ? (
                  <LockGlyph />
                ) : fit?.kind === "compartido" ? (
                  <HalfGlyph />
                ) : fit?.kind === "parcial" ? (
                  <span className="text-[9px] leading-none">1d</span>
                ) : (
                  standGlyph(blockedByFit ? "sold" : status, stand.id)
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {LEGEND_ITEMS.map((status) => (
          <span
            key={status}
            className="inline-flex items-center gap-2 rounded-full border border-pink-100 bg-white py-1.5 pl-2 pr-3 text-[13px] font-bold text-ink"
          >
            <LegendSwatch status={status} />
            {STATUS_STYLES[status].label}
          </span>
        ))}
        <span className="inline-flex items-center gap-2 rounded-full border border-pink-100 bg-white py-1.5 pl-2 pr-3 text-[13px] font-bold text-ink">
          <span
            className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-lavender-100 font-heading text-[12px] font-extrabold text-lavender-500 ring-2 ring-lavender-500"
            aria-hidden="true"
          >
            i
          </span>
          Módulo de informes
        </span>
        {partialCount > 0 && (
          <span className="inline-flex items-center gap-2 rounded-full border border-pink-100 bg-white py-1.5 pl-2 pr-3 text-[13px] font-bold text-ink">
            <span
              className={clsx(
                "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] text-[9px] font-bold",
                PARTIAL_STYLE.className
              )}
              aria-hidden="true"
            >
              1d
            </span>
            {PARTIAL_STYLE.label}
          </span>
        )}
        {sharedCount > 0 && (
          <span className="inline-flex items-center gap-2 rounded-full border border-pink-100 bg-white py-1.5 pl-2 pr-3 text-[13px] font-bold text-ink">
            <span
              className={clsx(
                "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px]",
                SHARED_STYLE.className
              )}
              aria-hidden="true"
            >
              <HalfGlyph />
            </span>
            {SHARED_STYLE.label}
          </span>
        )}
        {lockedCount > 0 && (
          <span className="inline-flex items-center gap-2 rounded-full border border-pink-100 bg-white py-1.5 pl-2 pr-3 text-[13px] font-bold text-ink">
            <span
              className={clsx(
                "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px]",
                LOCKED_STYLE.className
              )}
              aria-hidden="true"
            >
              <LockGlyph />
            </span>
            {LOCKED_STYLE.label}
          </span>
        )}
        {/* Sólo tiene sentido cuando ya hay uno elegido: si no, la
            leyenda anuncia un estado que no existe en el mapa. */}
        {selectedId && (
          <span className="inline-flex items-center gap-2 rounded-full border border-pink-300 bg-pink-50 py-1.5 pl-2 pr-3 text-[13px] font-extrabold text-pink-700">
            <span
              className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] bg-pink-500 text-[11px] font-bold text-white shadow-[0_0_0_3px_var(--color-pink-100)]"
              aria-hidden="true"
            >
              {selectedId}
            </span>
            Tu stand
          </span>
        )}
      </div>
    </div>
  );
}
