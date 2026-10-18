import { z } from "zod";

export const exerciseNameSchema = z
  .string()
  .transform((name) => name.trim().replace(/\s+/g, " "))
  .pipe(
    z
      .string()
      .min(1, "Escribe un nombre")
      .max(60, "Debe tener como máximo 60 caracteres"),
  );

export const exerciseIdSchema = z.string().min(1);
