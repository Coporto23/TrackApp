"use server";

import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { Prisma } from "@/generated/prisma/client";
import {
  clientIp,
  loginRetryAfter,
  recordRegistration,
  registerRetryAfter,
  tooManyAttemptsMessage,
} from "@/lib/auth-throttle";
import { hashPassword } from "@/lib/password";
import { createUserWithDefaults } from "@/lib/users";
import { loginSchema, registerSchema } from "@/lib/validation/auth";

export type AuthFormState =
  | {
      error?: string;
      fieldErrors?: Partial<Record<"email" | "password" | "confirmPassword", string[]>>;
      email?: string;
    }
  | undefined;

export async function login(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      email: String(formData.get("email") ?? ""),
    };
  }

  const { email } = parsed.data;
  const ip = clientIp(await headers());
  // Bloqueado: se avisa sin verificar la contraseña.
  const blocked = loginRetryAfter(email, ip);
  if (blocked > 0) return { error: tooManyAttemptsMessage(blocked), email };

  try {
    await signIn("credentials", { ...parsed.data, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type !== "CredentialsSignin") {
        return { error: "No se pudo iniciar sesión. Inténtalo de nuevo.", email };
      }
      // Si este fallo alcanzó el límite, se informa el bloqueo de inmediato.
      const retryAfter = loginRetryAfter(email, ip);
      return { error: retryAfter > 0 ? tooManyAttemptsMessage(retryAfter) : "Email o contraseña incorrectos", email };
    }
    throw error; // la redirección de éxito viaja como excepción
  }
}

export async function register(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      email: String(formData.get("email") ?? ""),
    };
  }

  const { email, password } = parsed.data;
  const ip = clientIp(await headers());
  const blocked = registerRetryAfter(ip);
  if (blocked > 0) return { error: tooManyAttemptsMessage(blocked), email };

  try {
    // Cuenta cada intento válido (también los de email repetido, para no
    // permitir sondear qué emails existen sin límite).
    recordRegistration(ip);
    await createUserWithDefaults(email, await hashPassword(password));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { fieldErrors: { email: ["Ya existe una cuenta con este email"] }, email };
    }
    throw error;
  }

  // Auto-login tras el registro.
  await signIn("credentials", { email, password, redirectTo: "/" });
}

export async function logout() {
  await signOut({ redirectTo: "/login" });
}
