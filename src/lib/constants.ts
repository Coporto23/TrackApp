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
