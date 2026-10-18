import { z } from "zod";

// Nombre de ejercicio o rutina: sin espacios sobrantes, 1 a 60 caracteres.
export const nameSchema = z
  .string()
  .transform((name) => name.trim().replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(1, "Escribe un nombre")
      .max(60, "Debe tener como máximo 60 caracteres"),
  );

export const idSchema = z.string().min(1);
