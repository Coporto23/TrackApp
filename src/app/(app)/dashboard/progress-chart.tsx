"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { formatShortDate, toUtcDate } from "@/lib/dates";
import type { ChartRow } from "@/lib/progress";

export type ChartSeries = { id: string; name: string; color: string };

// Colores de la paleta (globals.css) para los elementos recesivos del gráfico.
const FOG = "#968c7e";
const EDGE = "#2f2a23";
const STONE = "#1c1915";

const monthShort = new Intl.DateTimeFormat("es-CL", { month: "short", timeZone: "UTC" });
const monthYear = new Intl.DateTimeFormat("es-CL", { month: "short", year: "numeric", timeZone: "UTC" });
const clean = (text: string) => text.replace(/\./g, "").replace(/ de /g, " ");

// Etiqueta de un punto o periodo: "12 oct" (día o semana) u "oct 2026" (mes).
export const periodLabel = (key: string, byMonth: boolean) =>
  byMonth ? clean(monthYear.format(toUtcDate(key))) : formatShortDate(key);

export const formatNumber = (n: number) => n.toLocaleString("es-CL", { maximumFractionDigits: 1 });

function ChartTooltip({
  active,
  payload,
  label,
  byMonth,
  prefix,
  suffix,
}: TooltipContentProps & { byMonth: boolean; prefix?: string; suffix: string }) {
  if (!active || !payload?.length) return null;
  const key = typeof label === "number" ? new Date(label).toISOString().slice(0, 10) : String(label);
  return (
    <div className="facet facet-sm border border-stone-edge bg-ash/95 px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-display tracking-[0.1em] text-gold">
        {prefix}
        {periodLabel(key, byMonth)}
      </p>
      <ul className="space-y-0.5">
        {payload
          .filter((p) => typeof p.value === "number")
          .map((p) => (
            <li key={String(p.dataKey)} className="flex items-center gap-2 text-bone">
              <span aria-hidden className="h-2 w-2 rotate-45" style={{ background: p.color }} />
              <span className="text-fog">{p.name}</span>
              <span className="ml-auto pl-2">
                {formatNumber(p.value as number)} {suffix}
              </span>
            </li>
          ))}
      </ul>
    </div>
  );
}

const axisTick = { fill: FOG, fontSize: 11 };

// Línea por ejercicio. Con `timeScale`, el eje X es tiempo real (puntos por día
// con series); si no, periodos consecutivos (semanas o meses).
export function ProgressLineChart({
  rows,
  series,
  suffix,
  timeScale,
  byMonth = false,
  domain,
  tooltipPrefix,
}: {
  rows: ChartRow[];
  series: ChartSeries[];
  suffix: string;
  timeScale: boolean;
  byMonth?: boolean;
  // Extremos del rango (ms) para el eje de tiempo.
  domain?: [number, number];
  tooltipPrefix?: string;
}) {
  const data = timeScale ? rows.map((r) => ({ ...r, t: Date.parse(r.key) })) : rows;
  const tickFormatter = (value: number | string) => {
    const key = typeof value === "number" ? new Date(value).toISOString().slice(0, 10) : value;
    return byMonth ? clean(monthShort.format(toUtcDate(key))) : formatShortDate(key);
  };

  return (
    <LineChart responsive data={data} style={{ width: "100%", height: 180 }} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
      <CartesianGrid vertical={false} stroke={EDGE} />
      <XAxis
        dataKey={timeScale ? "t" : "key"}
        type={timeScale ? "number" : "category"}
        scale={timeScale ? "time" : "auto"}
        domain={timeScale ? domain : undefined}
        tickFormatter={tickFormatter}
        tick={axisTick}
        tickLine={false}
        axisLine={{ stroke: EDGE }}
        minTickGap={24}
      />
      <YAxis tick={axisTick} tickLine={false} axisLine={false} width={44} domain={["auto", "auto"]} allowDecimals={false} />
      <Tooltip
        cursor={{ stroke: FOG, strokeDasharray: "3 3" }}
        content={(props) => <ChartTooltip {...props} byMonth={byMonth} suffix={suffix} prefix={tooltipPrefix} />}
      />
      {series.map((s) => (
        <Line
          key={s.id}
          dataKey={s.id}
          name={s.name}
          stroke={s.color}
          strokeWidth={2}
          dot={{ r: 3, fill: s.color, stroke: STONE, strokeWidth: 1 }}
          activeDot={{ r: 5, fill: s.color, stroke: STONE, strokeWidth: 2 }}
          connectNulls
          isAnimationActive={false}
        />
      ))}
    </LineChart>
  );
}

// Barras agrupadas por ejercicio, una por periodo (semana o mes).
export function ProgressBarChart({
  rows,
  series,
  suffix,
  byMonth,
  tooltipPrefix,
}: {
  rows: ChartRow[];
  series: ChartSeries[];
  suffix: string;
  byMonth: boolean;
  tooltipPrefix?: string;
}) {
  return (
    <BarChart
      responsive
      data={rows}
      style={{ width: "100%", height: 180 }}
      margin={{ top: 8, right: 8, bottom: 0, left: -12 }}
      barGap={2}
      barCategoryGap="20%"
    >
      <CartesianGrid vertical={false} stroke={EDGE} />
      <XAxis
        dataKey="key"
        tickFormatter={(key: string) => (byMonth ? clean(monthShort.format(toUtcDate(key))) : formatShortDate(key))}
        tick={axisTick}
        tickLine={false}
        axisLine={{ stroke: EDGE }}
        minTickGap={16}
      />
      <YAxis
        tick={axisTick}
        tickLine={false}
        axisLine={false}
        width={44}
        tickFormatter={(v: number) => (v >= 1000 ? `${formatNumber(v / 1000)}k` : String(v))}
      />
      <Tooltip
        cursor={{ fill: "rgba(150,140,126,0.08)" }}
        content={(props) => <ChartTooltip {...props} byMonth={byMonth} suffix={suffix} prefix={tooltipPrefix} />}
      />
      {series.map((s) => (
        <Bar key={s.id} dataKey={s.id} name={s.name} fill={s.color} radius={[3, 3, 0, 0]} isAnimationActive={false} />
      ))}
    </BarChart>
  );
}
