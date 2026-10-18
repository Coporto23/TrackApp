// Constantes compartidas entre servidor y cliente.

export const FREE_SESSION_TITLE = "Entrenamiento libre";

// Debe coincidir con el enum WeightUnit de prisma/schema.prisma.
export const WEIGHT_UNITS = ["kg", "lbs", "level"] as const;
export type WeightUnitValue = (typeof WEIGHT_UNITS)[number];
export const WEIGHT_UNIT_LABELS: Record<WeightUnitValue, string> = {
  kg: "kg",
  lbs: "lbs",
  level: "nivel",
};

// Colores de los ejercicios comparados en el dashboard (validados para
// daltonismo y contraste ≥ 3:1 sobre `stone`). El orden es la posición de la ficha.
export const SERIES_COLORS = ["#d06e24", "#4d8fd1", "#a99236", "#b4659f"] as const;

// Cookie con los ejercicios elegidos en el dashboard ("id1,,id3", por posición):
// el servidor la lee al volver a /dashboard sin ?e= para restaurar la selección.
export const DASHBOARD_EXERCISES_COOKIE = "trackapp-dashboard-exercises";
