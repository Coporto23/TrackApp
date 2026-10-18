// Cálculos del dashboard (sin dependencias de servidor): conversión de unidades,
// 1RM estimado, agrupación por semana/mes, "antes → ahora", estados y rachas de
// la constancia. Las fechas son texto "YYYY-MM-DD" (ver dates.ts).

import type { WeightUnitValue } from "./constants";
import { addDays, addMonths, isIsoDate, startOfMonth, startOfWeek } from "./dates";

export const LB_TO_KG = 0.45359237;

// Máximo de ejercicios que se comparan a la vez (uno por color de serie).
export const MAX_COMPARED = 4;

export type ChartUnit = "kg" | "lbs";
export const CHART_UNITS: ChartUnit[] = ["kg", "lbs"];

// "custom": fechas elegidas por el usuario (Desde / Hasta).
export type RangeKey = "1m" | "6m" | "1y" | "2y" | "all" | "custom";
export type PresetRange = Exclude<RangeKey, "custom">;
export const RANGE_KEYS: RangeKey[] = ["1m", "6m", "1y", "2y", "all", "custom"];
export const RANGES: { key: PresetRange; label: string }[] = [
  { key: "1m", label: "1M" },
  { key: "6m", label: "6M" },
  { key: "1y", label: "1A" },
  { key: "2y", label: "2A" },
  { key: "all", label: "Todo" },
];
const RANGE_MONTHS: Record<Exclude<PresetRange, "all">, number> = { "1m": 1, "6m": 6, "1y": 12, "2y": 24 };

// Una serie tal como se registró. `load`: peso ("82.5") o nivel ("B").
export type RawSet = { reps: number; load: string; unit: WeightUnitValue };
export type ExerciseSession = { date: string; title: string; sets: RawSet[] };
// Historial de un ejercicio, con las sesiones en orden de fecha ascendente.
export type ExerciseHistory = { id: string; name: string; archived: boolean; sessions: ExerciseSession[] };

const round1 = (n: number) => Math.round(n * 10) / 10;

export function toKg(set: RawSet): number | null {
  if (set.unit === "level") return null;
  const value = Number(set.load);
  if (!Number.isFinite(value)) return null;
  return set.unit === "lbs" ? value * LB_TO_KG : value;
}

export const fromKg = (kg: number, unit: ChartUnit) => round1(unit === "lbs" ? kg / LB_TO_KG : kg);

// Epley: peso × (1 + reps/30); con 1 rep es el propio peso. Fuera de 1–12 reps
// la fórmula pierde precisión y no se usa.
export function epley(kg: number, reps: number): number | null {
  if (reps < 1 || reps > 12) return null;
  return reps === 1 ? kg : kg * (1 + reps / 30);
}

function maxOf(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null);
  return valid.length ? Math.max(...valid) : null;
}

export const sessionMaxKg = (sets: RawSet[]) => maxOf(sets.map(toKg));
export const sessionE1rmKg = (sets: RawSet[]) =>
  maxOf(sets.map((s) => {
    const kg = toKg(s);
    return kg === null ? null : epley(kg, s.reps);
  }));
export function sessionVolumeKg(sets: RawSet[]): number {
  return sets.reduce((sum, s) => sum + (toKg(s) ?? 0) * s.reps, 0);
}

// La serie más pesada del día (comparando en kg), en su unidad registrada. Si el
// día solo tiene niveles, el último nivel registrado.
export function bestSet(sets: RawSet[]): RawSet | null {
  let best: RawSet | null = null;
  let bestKg = -1;
  for (const set of sets) {
    const kg = toKg(set);
    if (kg !== null && kg > bestKg) {
      best = set;
      bestKg = kg;
    }
  }
  return best ?? sets.findLast((s) => s.unit === "level") ?? null;
}

// Primer día del rango. "Todo" parte de la primera sesión de los ejercicios dados.
export function rangeStart(range: PresetRange, today: string, histories: ExerciseHistory[]): string {
  if (range !== "all") return addMonths(today, -RANGE_MONTHS[range]);
  const firsts = histories.map((h) => h.sessions[0]?.date).filter(Boolean) as string[];
  return firsts.length ? firsts.sort()[0] : today;
}

// Rango de fechas inclusivo.
export type Span = { from: string; to: string };

// Rango guardado como "YYYY-MM-DD..YYYY-MM-DD" (Desde ≤ Hasta).
const SPAN = /^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/;
export function parseSpan(value: string | null): Span | null {
  const m = value?.match(SPAN);
  if (!m || !isIsoDate(m[1]) || !isIsoDate(m[2]) || m[1] > m[2]) return null;
  return { from: m[1], to: m[2] };
}
export const spanValue = ({ from, to }: Span) => `${from}..${to}`;

// Rango efectivo: un preset termina hoy; el personalizado no pasa de hoy (no hay
// series futuras). Sin rango personalizado guardado, vale como 6M.
export function resolveRange(range: RangeKey, today: string, histories: ExerciseHistory[], custom: Span | null): Span {
  if (range === "custom" && custom) {
    const to = custom.to < today ? custom.to : today;
    return { from: custom.from < to ? custom.from : to, to };
  }
  return { from: rangeStart(range === "custom" ? "6m" : range, today, histories), to: today };
}

// Preset equivalente para elegir semana o mes: el personalizado según su largo.
export function granularity(range: RangeKey, span: Span): PresetRange {
  if (range !== "custom") return range;
  const days = (Date.parse(span.to) - Date.parse(span.from)) / 86_400_000;
  return days <= 45 ? "1m" : days <= 200 ? "6m" : "1y";
}

export function inRange(history: ExerciseHistory, from: string, to: string): ExerciseHistory {
  return { ...history, sessions: history.sessions.filter((s) => s.date >= from && s.date <= to) };
}

// El ejercicio no tiene ninguna serie con peso (solo niveles) en estas sesiones.
export const isLevelOnly = (history: ExerciseHistory) =>
  history.sessions.length > 0 && history.sessions.every((s) => s.sets.every((set) => set.unit === "level"));

// Filas para Recharts: una por fecha/periodo, con una clave por ejercicio (su id).
export type ChartRow = { key: string } & Record<string, number | string | null>;

// Una fila por día con series de alguno de los ejercicios; null donde ese
// ejercicio no tiene valor (la línea une los puntos con connectNulls).
export function perSessionRows(
  histories: ExerciseHistory[],
  valueKg: (sets: RawSet[]) => number | null,
  unit: ChartUnit,
): ChartRow[] {
  const rows = new Map<string, ChartRow>();
  for (const h of histories) {
    for (const s of h.sessions) {
      const kg = valueKg(s.sets);
      if (kg === null) continue;
      const row = rows.get(s.date) ?? { key: s.date };
      row[h.id] = fromKg(kg, unit);
      rows.set(s.date, row);
    }
  }
  return [...rows.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export type Period = "week" | "month";
export const bucketOf = (date: string, period: Period) =>
  period === "week" ? startOfWeek(date) : startOfMonth(date);

// Todos los periodos entre dos fechas, sin huecos (eje temporal continuo).
export function periodKeys(from: string, to: string, period: Period): string[] {
  const keys: string[] = [];
  for (let k = bucketOf(from, period); k <= to; k = nextPeriod(k, period)) {
    keys.push(k);
  }
  return keys;
}

const nextPeriod = (key: string, period: Period) => (period === "week" ? addDays(key, 7) : addMonths(key, 1));

// Inicio del primer periodo completo del rango: un periodo cortado por el inicio
// se vería como una caída falsa. Con "Todo" no hay datos antes, así que se parte
// del periodo de la primera serie.
export function firstPeriodStart(from: string, period: Period, range: PresetRange): string {
  const start = bucketOf(from, period);
  return range === "all" || start === from ? start : nextPeriod(start, period);
}

// El último periodo no está completo dentro del rango (termina después de `to`).
export const lastPeriodOpen = (to: string, period: Period) =>
  addDays(nextPeriod(bucketOf(to, period), period), -1) > to;

// Volumen por semana en 1M; por mes en el resto.
export const volumePeriod = (range: PresetRange): Period => (range === "1m" ? "week" : "month");
// Series por semana en 1M y 6M; promedio semanal por mes en el resto.
export const setsPeriod = (range: PresetRange): Period => (range === "1m" || range === "6m" ? "week" : "month");

// Σ peso × reps por periodo; los periodos sin series valen 0.
export function volumeRows(
  histories: ExerciseHistory[],
  from: string,
  to: string,
  period: Period,
  unit: ChartUnit,
): ChartRow[] {
  const keys = periodKeys(from, to, period);
  return keys.map((key) => {
    const row: ChartRow = { key };
    for (const h of histories) {
      const kg = h.sessions
        .filter((s) => bucketOf(s.date, period) === key)
        .reduce((sum, s) => sum + sessionVolumeKg(s.sets), 0);
      row[h.id] = Math.round(fromKg(kg, unit));
    }
    return row;
  });
}

// Semanas (fraccionarias) de un mes que caen dentro de [from, to].
function weeksInMonth(monthKey: string, from: string, to: string): number {
  const start = monthKey > from ? monthKey : from;
  const monthEnd = addDays(addMonths(monthKey, 1), -1);
  const end = monthEnd < to ? monthEnd : to;
  const days = (Date.parse(end) - Date.parse(start)) / 86_400_000 + 1;
  return Math.max(days, 1) / 7;
}

// Nº de series por semana (incluye las de nivel). Con periodo "month", el
// promedio semanal de ese mes (dividiendo por todas sus semanas transcurridas).
export function setsRows(histories: ExerciseHistory[], from: string, to: string, period: Period): ChartRow[] {
  return periodKeys(from, to, period).map((key) => {
    const row: ChartRow = { key };
    for (const h of histories) {
      const count = h.sessions
        .filter((s) => bucketOf(s.date, period) === key)
        .reduce((sum, s) => sum + s.sets.length, 0);
      row[h.id] = period === "week" ? count : round1(count / weeksInMonth(key, from, to));
    }
    return row;
  });
}

export type Change = { from: number; to: number; pct: number };

// Primer y último valor con datos de un ejercicio en las filas (en volumen y
// series, los periodos en 0 no cuentan como "con datos").
export function changeFor(rows: ChartRow[], id: string): Change | null {
  const values = rows.map((r) => r[id]).filter((v): v is number => typeof v === "number" && v > 0);
  if (values.length < 2) return null;
  const from = values[0];
  const to = values[values.length - 1];
  return { from, to, pct: Math.round(((to - from) / from) * 100) };
}

// ---- Constancia ----

export type TrainingDay = { date: string; title: string; setCount: number };
export type DayState = "trained" | "planned" | "missed" | "rest";

export function dayState(day: TrainingDay | undefined, today: string | null): DayState {
  if (!day) return "rest";
  if (day.setCount > 0) return "trained";
  return today !== null && day.date < today ? "missed" : "planned";
}

// Entrenamientos del mes, promedio por semana (en lo transcurrido del mes) y
// semanas seguidas con al menos un entrenamiento hasta hoy.
export function monthStats(days: TrainingDay[], monthKey: string, today: string) {
  const trained = days.filter((d) => d.setCount > 0);
  const inMonth = trained.filter((d) => startOfMonth(d.date) === monthKey).length;
  const monthEnd = addDays(addMonths(monthKey, 1), -1);
  const perWeek = monthKey > today ? 0 : round1(inMonth / weeksInMonth(monthKey, monthKey, monthEnd < today ? monthEnd : today));

  const weeks = new Set(trained.map((d) => startOfWeek(d.date)));
  let week = startOfWeek(today);
  if (!weeks.has(week)) week = addDays(week, -7);
  let streak = 0;
  while (weeks.has(week)) {
    streak++;
    week = addDays(week, -7);
  }
  return { inMonth, perWeek, streak };
}
