"use server";

import { refresh } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/dal";
import { findExerciseByName } from "@/lib/data/exercises";
import { prisma } from "@/lib/prisma";
import { idSchema, nameSchema } from "@/lib/validation/common";

export type ExerciseFormState =
  | {
      error?: string;
      // Hay un ejercicio archivado con ese nombre: se ofrece restaurarlo.
      archivedMatch?: { id: string; name: string };
      ok?: boolean;
      // Ejercicio recién creado (permite seleccionarlo, p. ej. al armar una rutina).
      exercise?: { id: string; name: string };
      // Texto enviado, para no perderlo si hubo error.
      name?: string;
    }
  | undefined;

const DUPLICATE_ERROR = "Ya tienes un ejercicio con ese nombre";

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function createExercise(
  _prev: ExerciseFormState,
  formData: FormData,
): Promise<ExerciseFormState> {
  const user = await getCurrentUser();
  const raw = String(formData.get("name") ?? "");
  const parsed = nameSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, name: raw };
  const name = parsed.data;

  const existing = await findExerciseByName(user.id, name);
  if (existing?.archivedAt) {
    return { archivedMatch: { id: existing.id, name: existing.name }, name };
  }
  if (existing) return { error: DUPLICATE_ERROR, name };

  let exercise: { id: string; name: string };
  try {
    exercise = await prisma.exercise.create({
      data: { name, userId: user.id },
      select: { id: true, name: true },
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { error: DUPLICATE_ERROR, name };
    throw error;
  }
  refresh();
  return { ok: true, exercise };
}

export async function renameExercise(
  _prev: ExerciseFormState,
  formData: FormData,
): Promise<ExerciseFormState> {
  const user = await getCurrentUser();
  const id = idSchema.safeParse(formData.get("id"));
  const parsed = nameSchema.safeParse(formData.get("name") ?? "");
  if (!id.success) return { error: "Ejercicio no válido" };
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const name = parsed.data;

  const existing = await findExerciseByName(user.id, name, id.data);
  if (existing) {
    return {
      error: existing.archivedAt
        ? "Tienes un ejercicio archivado con ese nombre"
        : DUPLICATE_ERROR,
    };
  }

  try {
    // updateMany con userId: solo modifica si el ejercicio es del usuario.
    const { count } = await prisma.exercise.updateMany({
      where: { id: id.data, userId: user.id },
      data: { name },
    });
    if (count === 0) return { error: "Ejercicio no encontrado" };
  } catch (error) {
    if (isUniqueViolation(error)) return { error: DUPLICATE_ERROR };
    throw error;
  }
  refresh();
  return { ok: true };
}

async function setArchived(formData: FormData, archived: boolean) {
  const user = await getCurrentUser();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return;

  await prisma.exercise.updateMany({
    where: { id: id.data, userId: user.id },
    data: { archivedAt: archived ? new Date() : null },
  });
  refresh();
}

export async function archiveExercise(formData: FormData) {
  await setArchived(formData, true);
}

export async function restoreExercise(formData: FormData) {
  await setArchived(formData, false);
}
