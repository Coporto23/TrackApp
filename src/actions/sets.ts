"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { idSchema } from "@/lib/validation/common";
import { setSchema } from "@/lib/validation/set";

export type SetFormState =
  | {
      error?: string;
      fieldErrors?: Partial<Record<"reps" | "load" | "unit", string[]>>;
      ok?: boolean;
    }
  | undefined;

function invalid(error: z.ZodError): SetFormState {
  return { fieldErrors: z.flattenError(error).fieldErrors };
}

const readSet = (formData: FormData) =>
  setSchema.safeParse({
    reps: String(formData.get("reps") ?? ""),
    load: String(formData.get("load") ?? ""),
    unit: formData.get("unit"),
  });

// Registra la siguiente serie de un ejercicio del día.
export async function addSet(_prev: SetFormState, formData: FormData): Promise<SetFormState> {
  const user = await getCurrentUser();
  const sessionId = idSchema.safeParse(formData.get("sessionId"));
  const exerciseId = idSchema.safeParse(formData.get("exerciseId"));
  if (!sessionId.success || !exerciseId.success) return { error: "Ejercicio no válido" };
  const parsed = readSet(formData);
  if (!parsed.success) return invalid(parsed.error);

  // El ejercicio debe estar en una sesión del propio usuario.
  const inSession = await prisma.sessionExercise.findFirst({
    where: { sessionId: sessionId.data, exerciseId: exerciseId.data, session: { userId: user.id } },
    select: { id: true },
  });
  if (!inSession) return { error: "Ejercicio no encontrado en este entrenamiento" };

  const last = await prisma.set.aggregate({
    where: { sessionId: sessionId.data, exerciseId: exerciseId.data },
    _max: { setNumber: true },
  });
  await prisma.set.create({
    data: {
      sessionId: sessionId.data,
      exerciseId: exerciseId.data,
      setNumber: (last._max.setNumber ?? 0) + 1,
      reps: parsed.data.reps,
      weight: parsed.data.weight,
      level: parsed.data.level,
      weightUnit: parsed.data.unit,
    },
  });
  refresh();
  return { ok: true };
}

export async function updateSet(_prev: SetFormState, formData: FormData): Promise<SetFormState> {
  const user = await getCurrentUser();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { error: "Serie no válida" };
  const parsed = readSet(formData);
  if (!parsed.success) return invalid(parsed.error);

  const { count } = await prisma.set.updateMany({
    where: { id: id.data, session: { userId: user.id } },
    data: {
      reps: parsed.data.reps,
      weight: parsed.data.weight,
      level: parsed.data.level,
      weightUnit: parsed.data.unit,
    },
  });
  if (count === 0) return { error: "Serie no encontrada" };
  refresh();
  return { ok: true };
}

// Elimina una serie y renumera las siguientes para mantener 1, 2, 3…
export async function deleteSet(formData: FormData) {
  const user = await getCurrentUser();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return;

  const set = await prisma.set.findFirst({
    where: { id: id.data, session: { userId: user.id } },
    select: { id: true, sessionId: true, exerciseId: true, setNumber: true },
  });
  if (!set) return;

  await prisma.$transaction([
    prisma.set.delete({ where: { id: set.id } }),
    prisma.set.updateMany({
      where: { sessionId: set.sessionId, exerciseId: set.exerciseId, setNumber: { gt: set.setNumber } },
      data: { setNumber: { decrement: 1 } },
    }),
  ]);
  refresh();
}
