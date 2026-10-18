"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { CalendarIcon, CloseIcon, PlusIcon } from "@/components/icons";
import { DASHBOARD_EXERCISES_COOKIE, SERIES_COLORS } from "@/lib/constants";
import type { TrackedExercise } from "@/lib/data/dashboard";
import { formatDateRange } from "@/lib/dates";
import { useStoredChoice, useStoredValue, useToday } from "@/lib/hooks";
import {
  CHART_UNITS,
  changeFor,
  firstPeriodStart,
  granularity,
  inRange,
  isLevelOnly,
  lastPeriodOpen,
  MAX_COMPARED,
  parseSpan,
  perSessionRows,
  RANGE_KEYS,
  RANGES,
  resolveRange,
  sessionE1rmKg,
  sessionMaxKg,
  setsPeriod,
  setsRows,
  spanValue,
  volumePeriod,
  volumeRows,
  type ChartRow,
  type ChartUnit,
  type ExerciseHistory,
  type Period,
  type RangeKey,
  type Span,
  type TrainingDay,
} from "@/lib/progress";
import { ConsistencyCard } from "./consistency-card";
import { CustomRangeDialog } from "./custom-range-dialog";
import { ExerciseSelectDialog } from "./exercise-select-dialog";
import { LogTable } from "./log-table";
import { formatNumber, ProgressBarChart, ProgressLineChart, type ChartSeries } from "./progress-chart";

// Recuerda la selección para la próxima visita (recarga o volver desde otra pestaña).
function rememberSelection(value: string) {
  document.cookie = `${DASHBOARD_EXERCISES_COOKIE}=${value}; path=/dashboard; max-age=31536000; samesite=lax`;
}

// Ejercicio elegido en una posición (ficha) del filtro; la posición fija su color.
export type Slot = { id: string; name: string; color: string; history: ExerciseHistory };

export function DashboardView({
  exercises,
  slots,
  histories,
  trainingDays,
}: {
  exercises: TrackedExercise[];
  // Ids por posición; "" = posición libre (así quitar una ficha no repinta las demás).
  slots: string[];
  histories: ExerciseHistory[];
  trainingDays: TrainingDay[];
}) {
  const router = useRouter();
  const today = useToday();
  const [storedRange, setRange] = useStoredChoice<RangeKey>("dashboard.range", RANGE_KEYS, "6m");
  const [customValue, setCustomValue] = useStoredValue("dashboard.custom");
  const [unit, setUnit] = useStoredChoice<ChartUnit>("dashboard.unit", CHART_UNITS, "kg");
  const [picking, setPicking] = useState(false);
  const [editingRange, setEditingRange] = useState(false);
  const custom = parseSpan(customValue);
  // "custom" sin fechas guardadas (o inválidas) vale como 6M.
  const range: RangeKey = storedRange === "custom" && !custom ? "6m" : storedRange;

  const byId = new Map(histories.map((h) => [h.id, h]));
  const chosen: Slot[] = slots.flatMap((id, i) => {
    const history = byId.get(id);
    return history ? [{ id, name: history.name, color: SERIES_COLORS[i], history }] : [];
  });
  // Historial de cada ficha recortado al rango (sin "hoy" aún, el completo).
  const span = today ? resolveRange(range, today, chosen.map((s) => s.history), custom) : null;
  const ranged = chosen.map((s) => ({ ...s, history: span ? inRange(s.history, span.from, span.to) : s.history }));
  const rangeLabel =
    range === "custom" && span ? formatDateRange(span.from, span.to) : (RANGES.find((r) => r.key === range)?.label ?? "");

  function setSlots(next: string[]) {
    while (next.length && !next.at(-1)) next.pop();
    const value = next.join(",");
    rememberSelection(value);
    router.replace(`/dashboard?e=${value}`, { scroll: false });
  }
  const remove = (id: string) => setSlots(slots.map((s) => (s === id ? "" : s)));
  function add(ids: string[]) {
    const next = [...slots];
    for (const id of ids) {
      const free = next.indexOf("");
      if (free >= 0) next[free] = id;
      else if (next.length < MAX_COMPARED) next.push(id);
    }
    setSlots(next);
  }

  if (exercises.length === 0) {
    return (
      <p className="py-8 text-center text-fog">
        Aún no hay series registradas. Registra tus series en el calendario para ver aquí tu progreso.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <section aria-label="Filtros" className="space-y-3">
        <div>
          <p className="mb-1.5 font-display text-[11px] tracking-[0.16em] text-fog uppercase">Ejercicios</p>
          <ul className="flex flex-wrap gap-1.5">
            {ranged.map((slot) => {
              const levelOnly = isLevelOnly(slot.history);
              return (
                <li
                  key={slot.id}
                  className="facet facet-sm flex items-center gap-2 border border-stone-edge bg-ash py-1 pl-2.5 text-sm"
                >
                  <span
                    aria-hidden
                    className="h-2 w-2 shrink-0 rotate-45"
                    style={levelOnly ? { border: `1.5px solid ${slot.color}` } : { background: slot.color }}
                  />
                  <span className="text-bone">{slot.name}</span>
                  {levelOnly && <span className="text-[11px] text-fog">nivel · sin carga</span>}
                  <button
                    type="button"
                    onClick={() => remove(slot.id)}
                    aria-label={`Quitar ${slot.name}`}
                    title={`Quitar ${slot.name}`}
                    className="-my-1 flex h-9 w-9 items-center justify-center text-fog hover:text-bone"
                  >
                    <CloseIcon className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
            {chosen.length < MAX_COMPARED && (
              <li>
                <button
                  type="button"
                  onClick={() => setPicking(true)}
                  className="facet facet-sm flex h-11 items-center gap-1.5 border border-dashed border-stone-edge px-3 text-sm text-ember-bright hover:border-ember"
                >
                  <PlusIcon className="h-4 w-4" />
                  Agregar
                </button>
              </li>
            )}
          </ul>
        </div>

        <Segmented
          label="Rango"
          options={[
            ...RANGES.map((r) => ({ value: r.key as RangeKey, label: r.label })),
            { value: "custom" as const, label: <CalendarIcon className="mx-auto h-4 w-4" />, title: "Fechas" },
          ]}
          value={range}
          // "Fechas" abre el modal; el rango cambia solo al aceptar.
          onChange={(next) => (next === "custom" ? setEditingRange(true) : setRange(next))}
        />
        <div className="flex items-center gap-2">
          {range === "custom" && span ? (
            <p className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-bone">
              <span aria-hidden className="h-1.5 w-1.5 shrink-0 rotate-45 bg-ember" />
              <button
                type="button"
                onClick={() => setEditingRange(true)}
                className="min-h-11 truncate text-left hover:text-ember-bright"
                title="Cambiar fechas"
              >
                {rangeLabel}
              </button>
              <button
                type="button"
                onClick={() => setRange("6m")}
                aria-label="Quitar rango personalizado"
                title="Quitar rango personalizado"
                className="flex h-11 w-9 shrink-0 items-center justify-center text-fog hover:text-bone"
              >
                <CloseIcon className="h-3.5 w-3.5" />
              </button>
            </p>
          ) : (
            <span className="flex-1" />
          )}
          <Segmented
            label="Unidad"
            className="w-24"
            options={CHART_UNITS.map((u) => ({ value: u, label: u }))}
            value={unit}
            onChange={setUnit}
          />
        </div>
      </section>

      {chosen.length === 0 ? (
        <p className="facet border border-dashed border-stone-edge px-4 py-6 text-center text-sm text-fog">
          Elige uno o más ejercicios con «Agregar» para ver su progreso.
        </p>
      ) : span === null ? (
        <p className="text-fog">Avivando las brasas…</p>
      ) : (
        <ProgressCards slots={ranged} range={range} unit={unit} span={span} />
      )}

      <ConsistencyCard days={trainingDays} today={today} />

      {span !== null && chosen.length > 0 && <LogTable slots={ranged} rangeLabel={rangeLabel} />}

      {editingRange && today && (
        <CustomRangeDialog
          initial={custom ?? span ?? { from: today, to: today }}
          today={today}
          onAccept={(next: Span) => {
            setCustomValue(spanValue(next));
            setRange("custom");
          }}
          onClose={() => setEditingRange(false)}
        />
      )}

      {picking && (
        <ExerciseSelectDialog
          exercises={exercises}
          chosen={new Set(chosen.map((s) => s.id))}
          max={MAX_COMPARED - chosen.length}
          onAccept={add}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  );
}

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  className = "",
}: {
  label: string;
  options: { value: T; label: ReactNode; title?: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`flex border border-stone-edge bg-ash ${className}`}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={o.title}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={`h-11 flex-1 font-display text-[11px] tracking-[0.08em] uppercase transition-colors ${
              on ? "bg-gradient-to-b from-ember-bright to-ember font-bold text-abyss" : "text-fog hover:text-bone"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function ProgressCards({
  slots,
  range,
  unit,
  span,
}: {
  // Con el historial ya recortado al rango.
  slots: Slot[];
  range: RangeKey;
  unit: ChartUnit;
  span: Span;
}) {
  const { from, to } = span;
  // El personalizado agrupa como el preset de largo similar.
  const g = granularity(range, span);
  const histories = slots.map((s) => s.history);
  const all: ChartSeries[] = slots.map(({ id, name, color }) => ({ id, name, color }));
  // Los ejercicios solo con niveles no dibujan línea en las tarjetas de carga.
  const weighted = all.filter((_, i) => !isLevelOnly(histories[i]));
  const domain: [number, number] = [Date.parse(from), Date.parse(to)];

  const maxRows = perSessionRows(histories, sessionMaxKg, unit);
  const e1rmRows = perSessionRows(histories, sessionE1rmKg, unit);
  const volPeriod = volumePeriod(g);
  const setPeriod = setsPeriod(g);
  const volumeByMonth = volPeriod === "month";
  const setsByMonth = setPeriod === "month";
  const volRows = volumeRows(histories, firstPeriodStart(from, volPeriod, g), to, volPeriod, unit);
  const setRows = setsRows(histories, firstPeriodStart(from, setPeriod, g), to, setPeriod);
  // "Antes → ahora" por periodo compara solo periodos completos (sin el en curso).
  const closed = (rows: ChartRow[], period: Period) => (lastPeriodOpen(to, period) ? rows.slice(0, -1) : rows);

  return (
    <>
      <ChartCard title="Carga máxima" series={weighted} rows={maxRows} suffix={unit}>
        <ProgressLineChart rows={maxRows} series={weighted} suffix={unit} timeScale domain={domain} />
      </ChartCard>
      <ChartCard title="1RM estimado" note="Epley, series de 1 a 12 reps" series={weighted} rows={e1rmRows} suffix={unit}>
        <ProgressLineChart rows={e1rmRows} series={weighted} suffix={unit} timeScale domain={domain} />
      </ChartCard>
      <ChartCard
        title="Volumen"
        note={`peso × reps · por ${volumeByMonth ? "mes" : "semana"}`}
        series={weighted}
        rows={volRows}
        changeRows={closed(volRows, volPeriod)}
        suffix={unit}
      >
        <ProgressBarChart
          rows={volRows}
          series={weighted}
          suffix={unit}
          byMonth={volumeByMonth}
          tooltipPrefix={volumeByMonth ? undefined : "Semana del "}
        />
      </ChartCard>
      <ChartCard
        title="Series por semana"
        note={setsByMonth ? "promedio semanal de cada mes" : undefined}
        series={all}
        rows={setRows}
        changeRows={closed(setRows, setPeriod)}
        suffix="series"
      >
        <ProgressLineChart
          rows={setRows}
          series={all}
          suffix="series"
          timeScale={false}
          byMonth={setsByMonth}
          tooltipPrefix={setsByMonth ? undefined : "Semana del "}
        />
      </ChartCard>
    </>
  );
}

// Tarjeta de un gráfico: título, "antes → ahora" por ejercicio y el gráfico.
function ChartCard({
  title,
  note,
  series,
  rows,
  changeRows = rows,
  suffix,
  children,
}: {
  title: string;
  note?: string;
  series: ChartSeries[];
  rows: ChartRow[];
  // Filas para "antes → ahora" (por defecto, las del gráfico).
  changeRows?: ChartRow[];
  suffix: string;
  children: ReactNode;
}) {
  const hasData = series.length > 0 && rows.some((r) => series.some((s) => typeof r[s.id] === "number" && r[s.id] !== 0));

  return (
    <section aria-label={title} className="facet bg-stone-edge p-px">
      <div className="facet bg-stone/95 p-4">
        <header className="mb-2">
          <h2 className="font-display text-sm font-bold tracking-[0.14em] text-bone uppercase">{title}</h2>
          {note && <p className="text-xs text-fog">{note}</p>}
        </header>
        {series.length === 0 ? (
          <p className="py-6 text-center text-sm text-fog">Elige un ejercicio con series de peso.</p>
        ) : !hasData ? (
          <p className="py-6 text-center text-sm text-fog">Sin series en este rango.</p>
        ) : (
          <>
            <ul className="mb-2 space-y-1">
              {series.map((s) => {
                const change = changeFor(changeRows, s.id);
                return (
                  <li key={s.id} className="flex items-center gap-2 text-sm">
                    <span aria-hidden className="h-2 w-2 shrink-0 rotate-45" style={{ background: s.color }} />
                    <span className="min-w-0 flex-1 truncate text-fog">{s.name}</span>
                    {change ? (
                      <span className="whitespace-nowrap text-bone">
                        {formatNumber(change.from)} → <span className="text-gold">{formatNumber(change.to)}</span>{" "}
                        <span className="text-fog">{suffix}</span>{" "}
                        <span className={change.pct > 0 ? "font-bold text-ember-bright" : "text-fog"}>
                          {change.pct > 0 ? "+" : ""}
                          {change.pct}%
                        </span>
                      </span>
                    ) : (
                      <span className="text-fog">—</span>
                    )}
                  </li>
                );
              })}
            </ul>
            {children}
          </>
        )}
      </div>
    </section>
  );
}
