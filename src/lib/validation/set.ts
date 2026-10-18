import { z } from "zod";
import { WEIGHT_UNITS } from "../constants";

const reps = z
  .string()
  .trim()
  .min(1, "Ingresa las repeticiones")
  .regex(/^\d{1,3}$/, "Las repeticiones deben ser un número entero")
  .transform(Number)
  .pipe(z.number().min(1, "Al menos 1 repetición"));

// Peso (kg/lbs): solo números, con coma o punto decimal ("82,5" o "82.5"); máx.
// 9999.99 con 2 decimales (columna Decimal(6,2)). 0 es válido (peso corporal).
export const weightSchema = z
  .string()
  .trim()
  .min(1, "Ingresa el peso")
  .transform((v) => v.replace(",", "."))
  .pipe(z.string().regex(/^\d{1,4}(\.\d{1,2})?$/, "Peso no válido: solo números (máx. 9999,99)"));

// Nivel de máquina: número o texto corto ("5", "B", "A2").
export const levelSchema = z
  .string()
  .trim()
  .min(1, "Ingresa el nivel")
  .max(10, "Máximo 10 caracteres")
  .regex(/^[\p{L}\p{N}][\p{L}\p{N} .+-]*$/u, "Nivel no válido: usa letras o números");

// La carga ("load") se interpreta según la unidad: peso numérico o nivel en texto.
export const setSchema = z
  .object({ reps, load: z.string(), unit: z.enum(WEIGHT_UNITS, { message: "Unidad no válida" }) })
  .transform((data, ctx) => {
    const parsed = (data.unit === "level" ? levelSchema : weightSchema).safeParse(data.load);
    if (!parsed.success) {
      ctx.addIssue({ code: "custom", path: ["load"], message: parsed.error.issues[0].message });
      return z.NEVER;
    }
    return data.unit === "level"
      ? { reps: data.reps, unit: data.unit, weight: null, level: parsed.data }
      : { reps: data.reps, unit: data.unit, weight: parsed.data, level: null };
  });
