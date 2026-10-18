import { z } from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Ingresa un email válido"));

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Ingresa tu contraseña"),
});

export const registerSchema = z
  .object({
    email,
    password: z
      .string()
      .min(8, "Debe tener al menos 8 caracteres")
      .max(128, "Debe tener como máximo 128 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });
