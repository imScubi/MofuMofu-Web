"use client";

import { useEffect, useState } from "react";
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

interface StandMapProps {
  eventId: string;
  initialStands: EventStandRow[];
  selectedId: string | null;
  onSelect: (standId: string) => void;
}

const STATUS_STYLES: Record<
  StandStatus,
  { ring: string; fill: string; label: string }
> = {
  available: {
    ring: "ring-mint-500",
    fill: "bg-mint-500/35",
    label: "Disponible",
  },
  pending: {
    ring: "ring-amber-500",
    fill: "bg-amber-500/40",
    label: "En proceso de pago",
  },
  sold: {
    ring: "ring-pink-600",
    fill: "bg-pink-500/55",
    label: "Apartado",
  },
  blocked: {
    ring: "ring-gray-400",
    fill: "bg-gray-400/40",
    label: "No disponible",
  },
};

const LEGEND_ITEMS: { status: StandStatus; label: string }[] = [
  { status: "available", label: "Disponible" },
  { status: "pending", label: "En proceso" },
  { status: "sold", label: "Apartado" },
  { status: "blocked", label: "No disponible" },
];

export function StandMap({
  eventId,
  initialStands,
  selectedId,
  onSelect,
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

  return (
    <div>
      <div className="kawaii-scroll overflow-x-auto rounded-3xl bg-white p-2">
        <div
          className="relative mx-auto min-w-[640px]"
          style={{ aspectRatio: `${MAP_IMAGE_WIDTH} / ${MAP_IMAGE_HEIGHT}` }}
        >
          <Image
            src={MAP_IMAGE_SRC}
            alt="Plano del evento"
            fill
            sizes="(max-width: 768px) 100vw, 900px"
            className="select-none rounded-2xl object-contain"
            priority
          />

          {STAND_LAYOUT.map((stand) => {
            const data = stands[stand.id];
            const status: StandStatus = data?.status ?? "available";
            const left = (stand.x / MAP_IMAGE_WIDTH) * 100;
            const top = (stand.y / MAP_IMAGE_HEIGHT) * 100;
            const widthPct = (stand.size / MAP_IMAGE_WIDTH) * 100;
            const heightPct = (stand.size / MAP_IMAGE_HEIGHT) * 100;

            if (stand.shape === "info") {
              return (
                <div
                  key={stand.id}
                  title="Módulo de informes"
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-lavender-500 bg-lavender-500/25"
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    width: `${widthPct}%`,
                    height: `${heightPct}%`,
                  }}
                />
              );
            }

            const style = STATUS_STYLES[status];
            const isSelectable = stand.reservable && status === "available";
            const isSelected = selectedId === stand.id;

            return (
              <button
                key={stand.id}
                type="button"
                aria-label={`Stand ${stand.id}${isSelectable ? ", disponible" : ""}`}
                disabled={!isSelectable}
                onClick={() => onSelect(stand.id)}
                className={clsx(
                  "absolute -translate-x-1/2 -translate-y-1/2 rounded-md ring-2 transition-all duration-150",
                  isSelectable ? "cursor-pointer hover:brightness-110" : "cursor-not-allowed",
                  isSelected ? "ring-[3px] ring-pink-600 bg-pink-500/70" : clsx(style.ring, style.fill)
                )}
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: `${widthPct}%`,
                  height: `${heightPct}%`,
                }}
              />
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-ink-soft">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.status} className="flex items-center gap-1.5">
            <span
              className={clsx(
                "inline-block h-3.5 w-3.5 rounded ring-2",
                STATUS_STYLES[item.status].fill,
                STATUS_STYLES[item.status].ring
              )}
            />
            {item.label}
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3.5 w-3.5 rounded-full bg-lavender-500/25 ring-2 ring-lavender-500" />
          Módulo de informes
        </div>
      </div>
    </div>
  );
}
