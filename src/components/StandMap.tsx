"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { createClient } from "@/lib/supabase/client";
import {
  DECORATIVE_TREES,
  GROUNDS_OUTLINE_PATH,
  MAP_VIEWBOX,
  STAND_LAYOUT,
} from "@/lib/standLayout";
import type { StandRow, StandStatus } from "@/lib/types";

interface StandMapProps {
  initialStands: StandRow[];
  selectedId: string | null;
  onSelect: (standId: string, price: number) => void;
}

const STATUS_STYLES: Record<
  StandStatus,
  { fill: string; stroke: string; text: string; label: string }
> = {
  available: {
    fill: "fill-mint-100",
    stroke: "stroke-mint-500",
    text: "fill-ink",
    label: "Disponible",
  },
  pending: {
    fill: "fill-amber-100",
    stroke: "stroke-amber-500",
    text: "fill-ink",
    label: "En proceso de pago",
  },
  sold: {
    fill: "fill-pink-300",
    stroke: "stroke-pink-500",
    text: "fill-white",
    label: "Apartado",
  },
  blocked: {
    fill: "fill-gray-200",
    stroke: "stroke-gray-300",
    text: "fill-gray-400",
    label: "No disponible",
  },
};

const LEGEND_ITEMS: { status: StandStatus; label: string }[] = [
  { status: "available", label: "Disponible" },
  { status: "pending", label: "En proceso" },
  { status: "sold", label: "Apartado" },
  { status: "blocked", label: "No disponible" },
];

export function StandMap({ initialStands, selectedId, onSelect }: StandMapProps) {
  const [stands, setStands] = useState<Record<string, StandRow>>(() =>
    Object.fromEntries(initialStands.map((s) => [s.id, s]))
  );
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("stands-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "stands" },
        (payload) => {
          const updated = payload.new as StandRow;
          setStands((prev) => ({ ...prev, [updated.id]: updated }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const hoveredStand = hoveredId ? stands[hoveredId] : null;

  return (
    <div>
      <div className="kawaii-scroll overflow-x-auto rounded-3xl bg-gradient-to-b from-mint-100/60 to-white p-2">
        <svg
          viewBox={`0 0 ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}`}
          className="w-full min-w-[640px]"
          role="img"
          aria-label="Mapa interactivo de stands"
        >
          <path
            d={GROUNDS_OUTLINE_PATH}
            className="fill-mint-100/70 stroke-mint-300"
            strokeWidth={3}
          />

          {DECORATIVE_TREES.map((tree, i) => (
            <circle
              key={i}
              cx={tree.x}
              cy={tree.y}
              r={tree.r}
              className="fill-mint-300/70"
            />
          ))}

          {STAND_LAYOUT.map((stand) => {
            const data = stands[stand.id];
            const status: StandStatus = data?.status ?? "available";

            if (stand.shape === "info") {
              return (
                <g key={stand.id}>
                  <circle
                    cx={stand.x}
                    cy={stand.y}
                    r={stand.size / 2}
                    className="fill-lavender-300 stroke-lavender-500"
                    strokeWidth={2}
                  />
                  <text
                    x={stand.x}
                    y={stand.y + 4}
                    textAnchor="middle"
                    className="fill-white text-[13px] font-bold select-none"
                  >
                    i
                  </text>
                </g>
              );
            }

            const style = STATUS_STYLES[status];
            const isSelectable = stand.reservable && status === "available";
            const isSelected = selectedId === stand.id;

            return (
              <g
                key={stand.id}
                transform={`translate(${stand.x - stand.size / 2}, ${
                  stand.y - stand.size / 2
                })`}
                className={isSelectable ? "cursor-pointer" : "cursor-not-allowed"}
                onClick={() => isSelectable && onSelect(stand.id, data?.price ?? 0)}
                onMouseEnter={() => setHoveredId(stand.id)}
                onMouseLeave={() => setHoveredId((id) => (id === stand.id ? null : id))}
              >
                <rect
                  width={stand.size}
                  height={stand.size}
                  rx={8}
                  className={clsx(
                    style.fill,
                    style.stroke,
                    "transition-all duration-150",
                    isSelected && "fill-pink-500 stroke-pink-600",
                    isSelectable && "hover:brightness-105"
                  )}
                  strokeWidth={isSelected ? 3 : 2}
                />
                <text
                  x={stand.size / 2}
                  y={stand.size / 2 + 4}
                  textAnchor="middle"
                  className={clsx(
                    "text-[12px] font-bold select-none",
                    isSelected ? "fill-white" : style.text
                  )}
                >
                  {stand.id}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-ink-soft">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.status} className="flex items-center gap-1.5">
            <span
              className={clsx(
                "inline-block h-3.5 w-3.5 rounded-full border",
                STATUS_STYLES[item.status].fill,
                STATUS_STYLES[item.status].stroke
              )}
            />
            {item.label}
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3.5 w-3.5 rounded-full border bg-lavender-300 border-lavender-500" />
          Módulo de informes
        </div>
      </div>

      <div className="mt-2 h-5 text-center text-sm font-semibold text-pink-600">
        {hoveredStand && hoveredStand.status === "available"
          ? `Stand ${hoveredStand.id} · $${hoveredStand.price.toLocaleString("es-MX")} MXN`
          : ""}
      </div>
    </div>
  );
}
