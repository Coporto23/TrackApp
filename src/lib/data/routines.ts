import "server-only";
import { getCurrentUser } from "../dal";
import { prisma } from "../prisma";

export type RoutineSummary = { id: string; name: string; exerciseCount: number };
export type RoutineExerciseItem = { id: string; exerciseId: string; name: string };
export type RoutineDetail = { id: string; name: string; exercises: RoutineExerciseItem[] };

const collator = new Intl.Collator("es", { sensitivity: "base" });

// Solo cuentan/muestran ejercicios activos: los archivados se ocultan de las
// rutinas pero su vínculo se conserva por si se restauran.
const ACTIVE_EXERCISE = { exercise: { archivedAt: null } };

export async function getMyRoutines(): Promise<RoutineSummary[]> {
  const user = await getCurrentUser();
  const routines = await prisma.routine.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      name: true,
      _count: { select: { exercises: { where: ACTIVE_EXERCISE } } },
    },
  });
  return routines
    .map((r) => ({ id: r.id, name: r.name, exerciseCount: r._count.exercises }))
    .sort((a, b) => collator.compare(a.name, b.name));
}

export async function getMyRoutine(routineId: string): Promise<RoutineDetail | null> {
  const user = await getCurrentUser();
  const routine = await prisma.routine.findFirst({
    where: { id: routineId, userId: user.id },
    select: {
      id: true,
      name: true,
      exercises: {
        where: ACTIVE_EXERCISE,
        orderBy: { order: "asc" },
        select: { id: true, exerciseId: true, exercise: { select: { name: true } } },
      },
    },
  });
  if (!routine) return null;

  return {
    id: routine.id,
    name: routine.name,
    exercises: routine.exercises.map((re) => ({
      id: re.id,
      exerciseId: re.exerciseId,
      name: re.exercise.name,
    })),
  };
}

export function findRoutineByName(userId: string, name: string, excludeId?: string) {
  return prisma.routine.findFirst({
    where: {
      userId,
      name: { equals: name, mode: "insensitive" },
      ...(excludeId && { id: { not: excludeId } }),
    },
    select: { id: true },
  });
}
