"use client";

import { useState } from "react";
import { WEIGHT_UNIT_LABELS } from "@/lib/constants";
import { formatShortDate, formatWeekdayShort } from "@/lib/dates";
import { bestSet, type RawSet } from "@/lib/progress";
import type { Slot } from "./dashboard-view";

const PAGE = 10;

// "82.5" → "82,5"; los niveles van tal cual.
const showLoad = (set: RawSet) => (set.unit === "level" ? set.load : set.load.replace(".", ",").replace(/,00?$/, ""));

function setsText(sets: RawSet[]) {
  const unit = sets[0]?.unit;
  const sameWeightUnit = unit !== "level" && sets.every((s) => s.unit === unit);
  const text = sets.map((s) => `${showLoad(s)}×${s.reps}`).join(" · ");
  return sameWeightUnit ? `${text} ${WEIGHT_UNIT_LABELS[unit]}` : text;
}

// Registro "en duro" de los ejercicios elegidos en el rango, agrupado por día
// (más reciente primero). Aquí sí aparecen las series en nivel.
export function LogTable({ slots, rangeLabel }: { slots: Slot[]; rangeLabel: string }) {
  const [visibleDays, setVisibleDays] = useState(PAGE);

  const days = new Map<string, { title: string; rows: { slot: Slot; sets: RawSet[] }[] }>();
  for (const slot of slots) {
    for (const session of slot.history.sessions) {
      const day = days.get(session.date) ?? { title: session.title, rows: [] };
      day.rows.push({ slot, sets: session.sets });
      days.set(session.date, day);
    }
  }
  const sorted = [...days.entries()].sort(([a], [b]) => b.localeCompare(a));

  return (
    <section aria-label="Registro" className="facet bg-stone-edge p-px">
      <div className="facet bg-stone/95 p-4">
        <header className="mb-2 flex items-baseline justify-between gap-2">
          <h2 className="font-display text-sm font-bold tracking-[0.14em] text-bone uppercase">Registro</h2>
          <p className="text-xs text-fog">ejercicios elegidos · {rangeLabel}</p>
        </header>

        {sorted.length === 0 ? (
          <p className="py-6 text-center text-sm text-fog">Sin series en este rango.</p>
        ) : (
          <div className="space-y-3">
            {sorted.slice(0, visibleDays).map(([date, day]) => (
              <div key={date}>
                <p className="flex justify-between border-b border-stone-edge pb-1 font-display text-[11px] tracking-[0.14em] text-gold uppercase">
                  <span>
                    {formatWeekdayShort(date)} {formatShortDate(date)}
                  </span>
                  <span className="font-sans text-xs tracking-normal text-fog normal-case">{day.title}</span>
                </p>
                <table className="w-full text-sm">
                  <tbody>
                    {day.rows.map(({ slot, sets }) => {
                      const best = bestSet(sets);
                      return (
                        <tr key={slot.id} className="border-b border-stone-edge/50 align-top">
                          <th scope="row" className="w-[34%] py-1.5 pr-2 text-left font-normal text-bone">
                            <span
                              aria-hidden
                              className="mr-1.5 inline-block h-2 w-2 rotate-45"
                              style={{ background: slot.color }}
                            />
                            {slot.name}
                          </th>
                          <td className="py-1.5 text-fog">{setsText(sets)}</td>
                          <td className="py-1.5 pl-2 text-right whitespace-nowrap text-gold">
                            {best &&
                              (best.unit === "level" ? (
                                <>
                                  {best.load}{" "}
                                  <span className="border border-stone-edge px-1 text-[10px] text-fog">nivel</span>
                                </>
                              ) : (
                                `${showLoad(best)} ${WEIGHT_UNIT_LABELS[best.unit]}`
                              ))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
            {sorted.length > visibleDays && (
              <button
                type="button"
                onClick={() => setVisibleDays((n) => n + PAGE)}
                className="flex h-11 w-full items-center justify-center border border-dashed border-stone-edge font-display text-xs tracking-[0.14em] text-ember-bright uppercase hover:border-ember"
              >
                Ver más
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
