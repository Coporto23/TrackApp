"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { loadDayDetail } from "@/actions/dashboard";
import { BackIcon, ChevronRightIcon, CloseIcon } from "@/components/icons";
import { WEIGHT_UNIT_LABELS } from "@/lib/constants";
import type { DayDetail } from "@/lib/data/dashboard";
import {
  addMonths,
  dayOfMonth,
  formatLongDate,
  formatMonthLong,
  formatShortDate,
  formatWeekdayShort,
  monthDays,
  startOfMonth,
  toUtcDate,
} from "@/lib/dates";
import { dayState, monthStats, type DayState, type TrainingDay } from "@/lib/progress";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
const STATE_LABEL: Record<DayState, string> = {
  trained: "entrenado",
  planned: "planificado",
  missed: "no realizado",
  rest: "descanso",
};
const CELL: Record<DayState, string> = {
  trained: "border-ember/50 bg-gradient-to-b from-ember/35 to-ember-deep/50 text-bone",
  planned: "border-dashed border-stone-edge bg-ash text-fog",
  missed: "border-dashed border-stone-edge/70 bg-abyss/60 text-fog/70",
  rest: "border-transparent bg-ash text-fog",
};

const formatLoad = (load: string, unit: keyof typeof WEIGHT_UNIT_LABELS) =>
  unit === "level" ? `nivel ${load}` : `${load.replace(".", ",").replace(/,00?$/, "")} ${WEIGHT_UNIT_LABELS[unit]}`;

// Constancia: calendario mensual (lunes a domingo) de todos los entrenamientos.
// Tocar un día muestra su detalle debajo.
export function ConsistencyCard({ days, today }: { days: TrainingDay[]; today: string | null }) {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const [month, setMonth] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [details, setDetails] = useState<Map<string, DayDetail | null>>(new Map());

  const visibleMonth = month ?? (today && startOfMonth(today));
  // Sin elección: hoy si tiene entrenamiento; si no, el último día entrenado del mes visible.
  const selected =
    picked ??
    (visibleMonth && today
      ? today.startsWith(visibleMonth.slice(0, 7)) && byDate.has(today)
        ? today
        : (days.findLast((d) => d.setCount > 0 && d.date <= today && d.date.startsWith(visibleMonth.slice(0, 7)))
            ?.date ?? null)
      : null);

  const needsDetail = selected !== null && byDate.has(selected) && !details.has(selected);
  useEffect(() => {
    if (!needsDetail) return;
    let cancelled = false;
    loadDayDetail(selected).then((detail) => {
      if (!cancelled) setDetails((prev) => new Map(prev).set(selected, detail));
    });
    return () => {
      cancelled = true;
    };
  }, [needsDetail, selected]);

  if (!visibleMonth || !today) {
    return <CardShell><p className="py-6 text-center text-sm text-fog">Avivando las brasas…</p></CardShell>;
  }

  const cells = monthDays(visibleMonth);
  const leading = (toUtcDate(visibleMonth).getUTCDay() + 6) % 7;
  const stats = monthStats(days, visibleMonth, today);
  const changeMonth = (delta: number) => {
    setMonth(addMonths(visibleMonth, delta));
    setPicked(null);
  };

  return (
    <CardShell>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          aria-label="Mes anterior"
          title="Mes anterior"
          className="flex h-11 w-11 items-center justify-center border border-stone-edge bg-ash text-fog hover:text-bone"
        >
          <BackIcon className="h-4 w-4" />
        </button>
        <p aria-live="polite" className="font-display text-sm tracking-[0.14em] text-gold uppercase">
          {formatMonthLong(visibleMonth).replace(" de ", " ")}
        </p>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          aria-label="Mes siguiente"
          title="Mes siguiente"
          className="flex h-11 w-11 items-center justify-center border border-stone-edge bg-ash text-fog hover:text-bone"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>

      <div role="grid" aria-label="Días del mes" className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w, i) => (
          <span key={i} aria-hidden className="pb-0.5 text-center font-display text-[10px] text-fog">
            {w}
          </span>
        ))}
        {Array.from({ length: leading }, (_, i) => (
          <span key={`blank-${i}`} aria-hidden />
        ))}
        {cells.map((date) => {
          const state = dayState(byDate.get(date), today);
          const isSelected = date === selected;
          return (
            <button
              key={date}
              type="button"
              onClick={() => setPicked(date)}
              aria-pressed={isSelected}
              aria-label={`${formatLongDate(date)}: ${STATE_LABEL[state]}`}
              className={`relative flex h-11 flex-col items-center justify-center border text-sm transition-colors ${CELL[state]} ${
                isSelected ? "outline-2 -outline-offset-1 outline-ember-bright" : ""
              } ${date === today ? "font-bold text-ember-bright!" : ""}`}
            >
              {dayOfMonth(date)}
              {state === "trained" && <span aria-hidden className="mt-0.5 h-1.5 w-1.5 rotate-45 bg-ember-bright" />}
              {state === "missed" && <CloseIcon aria-hidden className="mt-0.5 h-2.5 w-2.5 text-fog" />}
            </button>
          );
        })}
      </div>

      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-fog">
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 border border-ember/50 bg-gradient-to-b from-ember/50 to-ember-deep/60" />
          Entrenado
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 border border-dashed border-fog/60" />
          Planificado
        </li>
        <li className="flex items-center gap-1.5">
          <CloseIcon className="h-2.5 w-2.5" />
          No realizado
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 bg-ash ring-1 ring-stone-edge" />
          Descanso
        </li>
      </ul>

      <dl className="mt-3 grid grid-cols-3 gap-1.5 text-center">
        <Stat value={String(stats.inMonth)} label="entrenos en el mes" />
        <Stat value={stats.perWeek.toLocaleString("es-CL")} label="por semana (prom.)" />
        <Stat value={String(stats.streak)} label="semanas seguidas" />
      </dl>

      {selected && <DayPanel date={selected} state={dayState(byDate.get(selected), today)} detail={details.get(selected)} />}
    </CardShell>
  );
}

function CardShell({ children }: { children: ReactNode }) {
  return (
    <section aria-label="Constancia" className="facet bg-stone-edge p-px">
      <div className="facet bg-stone/95 p-4">
        <header className="mb-2 flex items-baseline justify-between gap-2">
          <h2 className="font-display text-sm font-bold tracking-[0.14em] text-bone uppercase">Constancia</h2>
          <p className="text-xs text-fog">todos tus entrenamientos</p>
        </header>
        {children}
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-ash px-1 py-2">
      <dd className="font-display text-lg text-gold">{value}</dd>
      <dt className="text-[11px] leading-tight text-fog">{label}</dt>
    </div>
  );
}

// Detalle del día elegido. `detail` undefined = cargando.
function DayPanel({ date, state, detail }: { date: string; state: DayState; detail: DayDetail | null | undefined }) {
  const heading = `${formatWeekdayShort(date)} ${formatShortDate(date)}`;
  const link = (
    <Link href={`/calendario?d=${date}`} className="mt-1 inline-flex min-h-11 items-center text-sm text-ember-bright hover:underline">
      Abrir en el calendario ›
    </Link>
  );

  return (
    <div aria-live="polite" className="facet mt-3 border-l-2 border-ember bg-ash px-3 py-2.5">
      {state === "rest" ? (
        <>
          <h3 className="font-display text-xs tracking-[0.12em] text-bone uppercase">{heading}</h3>
          <p className="text-sm text-fog">Día de descanso</p>
        </>
      ) : detail === undefined ? (
        <p className="text-sm text-fog">Consultando el día…</p>
      ) : detail === null ? (
        <p className="text-sm text-fog">No se encontró este día.</p>
      ) : (
        <>
          <h3 className="font-display text-xs tracking-[0.12em] text-bone uppercase">
            {heading} · {detail.title}
          </h3>
          <p className="mb-1 text-sm text-fog">
            {state === "missed"
              ? "No realizado · sin series"
              : state === "planned"
                ? "Planificado · aún sin series"
                : `${detail.exercises.length} ${detail.exercises.length === 1 ? "ejercicio" : "ejercicios"} · ${detail.setCount} ${detail.setCount === 1 ? "serie" : "series"}`}
          </p>
          {state === "trained" && (
            <ul>
              {detail.exercises.map((e) => (
                <li key={e.name} className="flex justify-between gap-2 border-t border-stone-edge py-1.5 text-sm">
                  <span className="text-bone">{e.name}</span>
                  <span className="text-right text-fog">
                    {e.setCount} {e.setCount === 1 ? "serie" : "series"}
                    {e.best && ` · ${formatLoad(e.best.load, e.best.unit)}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {state !== "rest" && link}
    </div>
  );
}
