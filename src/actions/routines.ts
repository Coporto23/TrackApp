"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/dal";
import { findRoutineByName } from "@/lib/data/routines";
import { prisma } from "@/lib/prisma";
import { idSchema, nameSchema } from "@/lib/validation/common";

export type RoutineFormState =
  | {
      error?: string;
      ok?: boolean;
      // Rutina recién creada (permite seleccionarla, p. ej. desde el calendario).
      routine?: { id: string; name: string };
      // Texto enviado, para no perderlo si hubo error.
      name?: string;
    }
  | undefined;

const DUPLICATE_ERROR = "Ya tienes una rutina con ese nombre";

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

// Devuelve la rutina solo si pertenece al usuario autenticado.
async function findOwnedRoutine(userId: string, routineId: unknown) {
  const id = idSchema.safeParse(routineId);
  if (!id.success) return null;
  return prisma.routine.findFirst({ where: { id: id.data, userId }, select: { id: true } });
}

export async function createRoutine(
  _prev: RoutineFormState,
  formData: FormData,
): Promise<RoutineFormState> {
  const user = await getCurrentUser();
  const raw = String(formData.get("name") ?? "");
  const parsed = nameSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, name: raw };
  const name = parsed.data;

  if (await findRoutineByName(user.id, name)) return { error: DUPLICATE_ERROR, name };

  let routine: { id: string; name: string };
  try {
    routine = await prisma.routine.create({
      data: { name, userId: user.id },
      select: { id: true, name: true },
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { error: DUPLICATE_ERROR, name };
    throw error;
  }
  refresh();
  return { ok: true, routine };
}

export async function renameRoutine(
  _prev: RoutineFormState,
  formData: FormData,
): Promise<RoutineFormState> {
  const user = await getCurrentUser();
  const raw = String(formData.get("name") ?? "");
  const parsed = nameSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, name: raw };
  const name = parsed.data;

  const routine = await findOwnedRoutine(user.id, formData.get("id"));
  if (!routine) return { error: "Rutina no encontrada" };
  if (await findRoutineByName(user.id, name, routine.id)) return { error: DUPLICATE_ERROR, name };

  try {
    await prisma.routine.update({ where: { id: routine.id }, data: { name } });
  } catch (error) {
    if (isUniqueViolation(error)) return { error: DUPLICATE_ERROR, name };
    throw error;
  }
  refresh();
  return { ok: true };
}

// Borra la plantilla. Las sesiones ya entrenadas con ella se conservan
// (originRoutineId queda en null por la relación onDelete: SetNull).
export async function deleteRoutine(formData: FormData) {
  const user = await getCurrentUser();
  const routine = await findOwnedRoutine(user.id, formData.get("id"));
  if (routine) await prisma.routine.delete({ where: { id: routine.id } });
  redirect("/rutinas");
}

export async function addRoutineExercises(
  _prev: RoutineFormState,
  formData: FormData,
): Promise<RoutineFormState> {
  const user = await getCurrentUser();
  const routine = await findOwnedRoutine(user.id, formData.get("routineId"));
  if (!routine) return { error: "Rutina no encontrada" };

  const requested = formData.getAll("exerciseIds").map(String);
  if (requested.length === 0) return { error: "Selecciona al menos un ejercicio" };

  // Solo ejercicios activos del propio usuario que aún no estén en la rutina,
  // respetando el orden en que se seleccionaron.
  const [allowed, current] = await Promise.all([
    prisma.exercise.findMany({
      where: { id: { in: requested }, userId: user.id, archivedAt: null },
      select: { id: true },
    }),
    prisma.routineExercise.findMany({
      where: { routineId: routine.id },
      select: { exerciseId: true, order: true },
    }),
  ]);
  const allowedIds = new Set(allowed.map((e) => e.id));
  const existingIds = new Set(current.map((re) => re.exerciseId));
  const toAdd = [...new Set(requested)].filter((id) => allowedIds.has(id) && !existingIds.has(id));

  const nextOrder = current.reduce((max, re) => Math.max(max, re.order), -1) + 1;
  await prisma.routineExercise.createMany({
    data: toAdd.map((exerciseId, i) => ({ routineId: routine.id, exerciseId, order: nextOrder + i })),
    skipDuplicates: true,
  });
  refresh();
  return { ok: true };
}

export async function removeRoutineExercise(formData: FormData) {
  const user = await getCurrentUser();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return;

  await prisma.routineExercise.deleteMany({
    where: { id: id.data, routine: { userId: user.id } },
  });
  refresh();
}

// Recibe los ids de RoutineExercise en el nuevo orden (tras arrastrar y soltar).
export async function reorderRoutineExercises(routineId: string, orderedIds: string[]) {
  const user = await getCurrentUser();
  // Se invoca directo desde el cliente: no confiar en la forma de los argumentos.
  if (!Array.isArray(orderedIds) || !orderedIds.every((id) => typeof id === "string")) {
    return { error: "Orden no válido" };
  }
  const routine = await findOwnedRoutine(user.id, routineId);
  if (!routine) return { error: "Rutina no encontrada" };

  const current = await prisma.routineExercise.findMany({
    where: { routineId: routine.id },
    select: { id: true },
  });
  const currentIds = new Set(current.map((re) => re.id));
  const valid =
    orderedIds.length > 0 &&
    new Set(orderedIds).size === orderedIds.length &&
    orderedIds.every((id) => currentIds.has(id));
  if (!valid) return { error: "El orden enviado no coincide con la rutina" };

  // Los ejercicios archivados (ocultos) no vienen en la lista: van al final.
  const hidden = current.map((re) => re.id).filter((id) => !orderedIds.includes(id));
  await prisma.$transaction(
    [...orderedIds, ...hidden].map((id, order) =>
      prisma.routineExercise.update({ where: { id }, data: { order } }),
    ),
  );
  refresh();
  return { ok: true };
}
