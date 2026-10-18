"use server";

import { getMyDayDetail, type DayDetail } from "@/lib/data/dashboard";
import { isIsoDate } from "@/lib/dates";

// Lectura bajo demanda del detalle de un día de la constancia (al tocarlo).
// La pertenencia la verifica getMyDayDetail (sesión del usuario autenticado).
export async function loadDayDetail(date: unknown): Promise<DayDetail | null> {
  if (!isIsoDate(date)) return null;
  return getMyDayDetail(date);
}
