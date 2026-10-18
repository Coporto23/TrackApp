// Fechas de calendario como texto "YYYY-MM-DD" (sin hora ni zona horaria).
// Toda la aritmética se hace en UTC para que un día nunca se corra por la zona
// horaria; en BD se guardan como `@db.Date` (medianoche UTC de ese día).

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const date = toUtcDate(value);
  return !Number.isNaN(date.getTime()) && toIsoDate(date) === value;
}

export function toUtcDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// "Hoy" según el reloj local de quien lo llama (en el navegador: el del usuario).
export function localToday(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function addDays(iso: string, days: number): string {
  const date = toUtcDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
}

// Lunes de la semana que contiene `iso` (semana de lunes a domingo).
export function startOfWeek(iso: string): string {
  const weekday = (toUtcDate(iso).getUTCDay() + 6) % 7; // lunes = 0
  return addDays(iso, -weekday);
}

export function weekDays(iso: string): string[] {
  const monday = startOfWeek(iso);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

const longFormat = new Intl.DateTimeFormat("es-CL", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});
const shortWeekday = new Intl.DateTimeFormat("es-CL", { weekday: "narrow", timeZone: "UTC" });
const monthYear = new Intl.DateTimeFormat("es-CL", { month: "short", year: "numeric", timeZone: "UTC" });
const dayMonth = new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short", timeZone: "UTC" });

// "lunes, 19 de octubre"
export const formatLongDate = (iso: string) => longFormat.format(toUtcDate(iso));
// "L"
export const formatWeekdayInitial = (iso: string) => shortWeekday.format(toUtcDate(iso)).toUpperCase();
// "12 – 18 oct 2026" (o "28 sept – 4 oct 2026" si cruza de mes)
export function formatWeekRange(days: string[]) {
  const first = toUtcDate(days[0]);
  const last = toUtcDate(days[days.length - 1]);
  const sameMonth = first.getUTCMonth() === last.getUTCMonth();
  const start = sameMonth ? String(first.getUTCDate()) : dayMonth.format(first);
  return `${start} – ${dayMonth.format(last).replace(/\.$/, "")} ${last.getUTCFullYear()}`.replace(
    / de /g,
    " ",
  );
}
export const formatMonthYear = (iso: string) => monthYear.format(toUtcDate(iso));
export const dayOfMonth = (iso: string) => toUtcDate(iso).getUTCDate();
// "12 oct"
export const formatShortDate = (iso: string) =>
  dayMonth.format(toUtcDate(iso)).replace(/\.$/, "").replace(/ de /g, " ");
