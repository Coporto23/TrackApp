import "server-only";
import { getCurrentUser } from "../dal";
import { prisma } from "../prisma";

export type ExerciseItem = { id: string; name: string };

const collator = new Intl.Collator("es", { sensitivity: "base" });

// Ejercicios del usuario autenticado, separados en activos y archivados,
// ordenados alfabéticamente según las reglas del español (tildes incluidas).
export async function getMyExercises() {
  const user = await getCurrentUser();
  const exercises = await prisma.exercise.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, archivedAt: true },
  });
  exercises.sort((a, b) => collator.compare(a.name, b.name));

  const toItem = ({ id, name }: ExerciseItem) => ({ id, name });
  return {
    active: exercises.filter((e) => !e.archivedAt).map(toItem),
    archived: exercises.filter((e) => e.archivedAt).map(toItem),
  };
}

// Busca un ejercicio del usuario con el mismo nombre ignorando mayúsculas,
// para evitar duplicados como "Sentadilla" y "sentadilla".
export function findExerciseByName(userId: string, name: string, excludeId?: string) {
  return prisma.exercise.findFirst({
    where: {
      userId,
      name: { equals: name, mode: "insensitive" },
      ...(excludeId && { id: { not: excludeId } }),
    },
    select: { id: true, name: true, archivedAt: true },
  });
}
