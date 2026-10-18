"use server";

import { refresh } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/dal";
import { isIsoDate, toUtcDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { idSchema } from "@/lib/validation/common";

export type SessionFormState = { error?: string; ok?: boolean } | undefined;

// Devuelve la sesión solo si pertenece al usuario autenticado.
async function findOwnedSession(userId: string, sessionId: unknown) {
  const id = idSchema.safeParse(sessionId);
  if (!id.success) return null;
  return prisma.workoutSession.findFirst({
    where: { id: id.data, userId },
    select: { id: true, originRoutineId: true },
  });
}

// Crea el entrenamiento de un día. Con rutina, copia sus ejercicios activos en
// orden; sin rutina (`routineId` vacío) es un entrenamiento libre.
export async function createSession(
  _prev: SessionFormState,
  formData: FormData,
): Promise<SessionFormState> {
  const user = await getCurrentUser();
  const date = formData.get("date");
  if (!isIsoDate(date)) return { error: "Fecha no válida" };

  const rawRoutineId = String(formData.get("routineId") ?? "");
  let routine: { id: string; exercises: { exerciseId: string }[] } | null = null;
  if (rawRoutineId) {
    routine = await prisma.routine.findFirst({
      where: { id: rawRoutineId, userId: user.id },
      select: {
        id: true,
        exercises: {
          where: { exercise: { archivedAt: null } },
          orderBy: { order: "asc" },
          select: { exerciseId: true },
        },
      },
    });
    if (!routine) return { error: "Rutina no encontrada" };
  }

  try {
    await prisma.workoutSession.create({
      data: {
        userId: user.id,
        date: toUtcDate(date),
        originRoutineId: routine?.id,
        exercises: {
          create: routine?.exercises.map((e, order) => ({ exerciseId: e.exerciseId, order })) ?? [],
        },
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Ya hay un entrenamiento en este día" };
    }
    throw error;
  }
  refresh();
  return { ok: true };
}

// Borra la sesión con sus ejercicios y series (cascada). Irreversible.
export async function deleteSession(formData: FormData) {
  const user = await getCurrentUser();
  const session = await findOwnedSession(user.id, formData.get("id"));
  if (session) await prisma.workoutSession.delete({ where: { id: session.id } });
  refresh();
}

export async function addSessionExercises(
  _prev: SessionFormState,
  formData: FormData,
): Promise<SessionFormState> {
  const user = await getCurrentUser();
  const session = await findOwnedSession(user.id, formData.get("sessionId"));
  if (!session) return { error: "Entrenamiento no encontrado" };

  const requested = formData.getAll("exerciseIds").map(String);
  if (requested.length === 0) return { error: "Selecciona al menos un ejercicio" };

  // Solo ejercicios activos del propio usuario que aún no estén en la sesión,
  // respetando el orden en que se seleccionaron.
  const [allowed, current] = await Promise.all([
    prisma.exercise.findMany({
      where: { id: { in: requested }, userId: user.id, archivedAt: null },
      select: { id: true },
    }),
    prisma.sessionExercise.findMany({
      where: { sessionId: session.id },
      select: { exerciseId: true, order: true },
    }),
  ]);
  const allowedIds = new Set(allowed.map((e) => e.id));
  const existingIds = new Set(current.map((se) => se.exerciseId));
  const toAdd = [...new Set(requested)].filter((id) => allowedIds.has(id) && !existingIds.has(id));

  const nextOrder = current.reduce((max, se) => Math.max(max, se.order), -1) + 1;
  await prisma.sessionExercise.createMany({
    data: toAdd.map((exerciseId, i) => ({ sessionId: session.id, exerciseId, order: nextOrder + i })),
    skipDuplicates: true,
  });
  refresh();
  return { ok: true };
}

// Quita un ejercicio del día. Si ya tiene series registradas no se quita, para
// no perder datos (las series se gestionan en la sesión activa, paso 11).
export async function removeSessionExercise(formData: FormData) {
  const user = await getCurrentUser();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return;

  const row = await prisma.sessionExercise.findFirst({
    where: { id: id.data, session: { userId: user.id } },
    select: { id: true, sessionId: true, exerciseId: true },
  });
  if (!row) return;

  const sets = await prisma.set.count({
    where: { sessionId: row.sessionId, exerciseId: row.exerciseId },
  });
  if (sets === 0) await prisma.sessionExercise.delete({ where: { id: row.id } });
  refresh();
}

// Recibe los ids de SessionExercise en el nuevo orden (tras arrastrar y soltar).
export async function reorderSessionExercises(sessionId: string, orderedIds: string[]) {
  const user = await getCurrentUser();
  // Se invoca directo desde el cliente: no confiar en la forma de los argumentos.
  if (!Array.isArray(orderedIds) || !orderedIds.every((id) => typeof id === "string")) {
    return { error: "Orden no válido" };
  }
  const session = await findOwnedSession(user.id, sessionId);
  if (!session) return { error: "Entrenamiento no encontrado" };

  const current = await prisma.sessionExercise.findMany({
    where: { sessionId: session.id },
    select: { id: true },
  });
  const currentIds = new Set(current.map((se) => se.id));
  const valid =
    orderedIds.length === current.length &&
    new Set(orderedIds).size === orderedIds.length &&
    orderedIds.every((id) => currentIds.has(id));
  if (!valid) return { error: "El orden enviado no coincide con el entrenamiento" };

  await prisma.$transaction(
    orderedIds.map((id, order) => prisma.sessionExercise.update({ where: { id }, data: { order } })),
  );
  refresh();
  return { ok: true };
}

// Reemplaza los ejercicios de la rutina de origen por los del día, en el mismo
// orden. Los ejercicios archivados de la rutina (ocultos) se conservan al final.
export async function saveSessionToRoutine(formData: FormData) {
  const user = await getCurrentUser();
  const session = await findOwnedSession(user.id, formData.get("id"));
  if (!session?.originRoutineId) return;
  const routineId = session.originRoutineId;

  const [dayExercises, hiddenArchived] = await Promise.all([
    prisma.sessionExercise.findMany({
      where: { sessionId: session.id },
      orderBy: { order: "asc" },
      select: { exerciseId: true },
    }),
    prisma.routineExercise.findMany({
      where: { routineId, exercise: { archivedAt: { not: null } } },
      orderBy: { order: "asc" },
      select: { exerciseId: true },
    }),
  ]);
  const dayIds = dayExercises.map((e) => e.exerciseId);
  const keep = hiddenArchived.map((e) => e.exerciseId).filter((id) => !dayIds.includes(id));

  await prisma.$transaction([
    prisma.routineExercise.deleteMany({ where: { routineId } }),
    prisma.routineExercise.createMany({
      data: [...dayIds, ...keep].map((exerciseId, order) => ({ routineId, exerciseId, order })),
    }),
  ]);
  refresh();
}
