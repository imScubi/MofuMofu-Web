"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import {
  describePrize,
  parsePrizeCategories,
  placeLabel,
  type PrizeCategory,
} from "@/lib/contestRegulation";
import { eventDays, formatDayLong } from "@/lib/eventDays";
import { inputClass, labelClass } from "@/lib/formClasses";
import type { ContestRow, EventRow } from "@/lib/types";

/**
 * Premios, cuotas y día del concurso.
 *
 * Todo lo que se toca aquí termina en el reglamento que lee el
 * participante — por eso al lado de cada lugar se ve, en texto, cómo va
 * a quedar escrito.
 *
 * Los cambios se guardan al presionar "Guardar", no campo por campo:
 * una premiación a medio editar (subiste el efectivo pero no el
 * porcentaje) no debe quedar publicada mientras la piensas.
 */
export function PrizeEditor({
  contest,
  event,
  onSave,
  busy,
}: {
  contest: ContestRow;
  event: EventRow;
  onSave: (body: Record<string, unknown>) => Promise<void>;
  busy: boolean;
}) {
  const days = eventDays(event.date_start, event.date_end);

  const [categories, setCategories] = useState<PrizeCategory[]>(() =>
    parsePrizeCategories(contest.prize_categories)
  );
  const [day, setDay] = useState(contest.day ?? "");
  const [notes, setNotes] = useState(contest.regulation_notes ?? "");
  const [dirty, setDirty] = useState(false);

  function update(next: PrizeCategory[]) {
    setCategories(next);
    setDirty(true);
  }

  function updateCategory(index: number, patch: Partial<PrizeCategory>) {
    update(categories.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function updatePlace(
    categoryIndex: number,
    placeIndex: number,
    patch: Partial<PrizeCategory["places"][number]>
  ) {
    update(
      categories.map((c, i) =>
        i === categoryIndex
          ? {
              ...c,
              places: c.places.map((p, j) =>
                j === placeIndex ? { ...p, ...patch } : p
              ),
            }
          : c
      )
    );
  }

  async function save() {
    await onSave({
      prizeCategories: categories,
      day: day || null,
      regulationNotes: notes.trim(),
    });
    setDirty(false);
  }

  return (
    <div className="rounded-2xl bg-cream/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-heading text-[15px] font-bold text-ink">
          Premios y reglamento
        </h4>
        <Link
          href={`/convocatorias/${contest.id}/reglamento`}
          target="_blank"
          className="text-[12.5px] font-bold text-pink-700 underline underline-offset-2"
        >
          Ver el reglamento ↗
        </Link>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Día del concurso</label>
          <select
            className={inputClass}
            value={day}
            onChange={(e) => {
              setDay(e.target.value);
              setDirty(true);
            }}
          >
            <option value="">Sin definir</option>
            {days.map((d) => (
              <option key={d} value={d}>
                {formatDayLong(d)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {categories.map((category, categoryIndex) => (
          <div
            key={categoryIndex}
            className="rounded-2xl border border-pink-100 bg-white p-3.5"
          >
            <div className="grid gap-3 sm:grid-cols-[1.6fr_1fr_1fr_auto] sm:items-end">
              <div>
                <label className={labelClass}>Categoría</label>
                <input
                  className={inputClass}
                  value={category.label}
                  onChange={(e) =>
                    updateCategory(categoryIndex, { label: e.target.value })
                  }
                  placeholder="Ej. Modalidad Grupal"
                />
              </div>
              <div>
                <label className={labelClass}>Entrada ($)</label>
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={category.entryFee}
                  onChange={(e) =>
                    updateCategory(categoryIndex, {
                      entryFee: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Cupo</label>
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  value={category.slots ?? ""}
                  placeholder="Sin límite"
                  onChange={(e) =>
                    updateCategory(categoryIndex, {
                      slots: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </div>
              <Button
                variant="ghost"
                onClick={() =>
                  update(categories.filter((_, i) => i !== categoryIndex))
                }
                className="!px-3 !py-1.5 text-xs !text-danger-600"
              >
                Quitar
              </Button>
            </div>

            <div className="mt-3 space-y-2">
              {category.places.map((place, placeIndex) => (
                <div
                  key={placeIndex}
                  className="grid gap-2 rounded-xl bg-cream/70 p-2.5 sm:grid-cols-[86px_1fr_1fr_1.6fr_auto] sm:items-center"
                >
                  <span className="text-[13px] font-bold text-ink">
                    {placeLabel(placeIndex)}
                  </span>
                  <label className="text-[12px] font-semibold text-ink-soft">
                    Efectivo
                    <input
                      type="number"
                      min={0}
                      className={`${inputClass} !min-h-[38px] !py-1.5 !text-[14px]`}
                      value={place.cash}
                      onChange={(e) =>
                        updatePlace(categoryIndex, placeIndex, {
                          cash: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </label>
                  <label className="text-[12px] font-semibold text-ink-soft">
                    % recaudado
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className={`${inputClass} !min-h-[38px] !py-1.5 !text-[14px]`}
                      value={place.percent}
                      onChange={(e) =>
                        updatePlace(categoryIndex, placeIndex, {
                          percent: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </label>
                  <label className="text-[12px] font-semibold text-ink-soft">
                    Otro premio
                    <input
                      className={`${inputClass} !min-h-[38px] !py-1.5 !text-[14px]`}
                      value={place.other}
                      placeholder="Ej. Paquete de figuras"
                      onChange={(e) =>
                        updatePlace(categoryIndex, placeIndex, {
                          other: e.target.value,
                        })
                      }
                    />
                  </label>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      updateCategory(categoryIndex, {
                        places: category.places.filter((_, j) => j !== placeIndex),
                      })
                    }
                    className="!px-3 !py-1 text-xs !text-danger-600"
                  >
                    Quitar
                  </Button>

                  {/* Cómo va a quedar escrito en el reglamento. */}
                  <p className="text-[12.5px] text-ink-soft sm:col-span-5">
                    En el reglamento:{" "}
                    <strong className="text-ink">
                      {describePrize(
                        place,
                        categories.length > 1 ? category.label : undefined
                      )}
                    </strong>
                  </p>
                </div>
              ))}

              <Button
                variant="secondary"
                onClick={() =>
                  updateCategory(categoryIndex, {
                    places: [
                      ...category.places,
                      { cash: 0, percent: 0, other: "" },
                    ],
                  })
                }
                className="!px-4 !py-1.5 text-xs"
              >
                + Agregar {placeLabel(category.places.length)}
              </Button>
            </div>
          </div>
        ))}

        <Button
          variant="ghost"
          onClick={() =>
            update([
              ...categories,
              {
                label: "Nueva categoría",
                entryFee: 0,
                slots: null,
                places: [{ cash: 0, percent: 0, other: "" }],
              },
            ])
          }
          className="!px-4 !py-1.5 text-xs"
        >
          + Agregar categoría de premiación
        </Button>
      </div>

      <div className="mt-4">
        <label className={labelClass}>Avisos extra para el reglamento</label>
        <textarea
          className={inputClass}
          rows={2}
          maxLength={1200}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setDirty(true);
          }}
          placeholder="Algo específico de esta edición que deba salir en el documento"
        />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Button disabled={busy || !dirty} onClick={save}>
          {busy ? "Guardando..." : "Guardar premios y reglamento"}
        </Button>
        {dirty && (
          <span className="text-[13px] font-semibold text-amber-500">
            Hay cambios sin guardar
          </span>
        )}
      </div>
    </div>
  );
}
