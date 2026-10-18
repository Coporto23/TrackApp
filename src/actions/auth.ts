"use server";

import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { Prisma } from "@/generated/prisma/client";
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

  try {
    await signIn("credentials", { ...parsed.data, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      const message =
        error.type === "CredentialsSignin"
          ? "Email o contraseña incorrectos"
          : "No se pudo iniciar sesión. Inténtalo de nuevo.";
      return { error: message, email: parsed.data.email };
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
  try {
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
