import "server-only";
import { FREE_SESSION_TITLE } from "../constants";
import { getCurrentUser } from "../dal";
import { toIsoDate, toUtcDate } from "../dates";
import { prisma } from "../prisma";
import { bestSet, MAX_COMPARED, type ExerciseHistory, type RawSet, type TrainingDay } from "../progress";

// Ejercicio elegible en el dashboard: tiene al menos una serie (incluye archivados).
export type TrackedExercise = { id: string; name: string; archived: boolean };

export type DayDetail = {
  date: string;
  title: string;
  setCount: number;
  exercises: { name: string; setCount: number; best: RawSet | null }[];
};

const collator = new Intl.Collator("es", { sensitivity: "base" });

const toRawSet = (s: { reps: number; weight: { toString(): string } | null; level: string | null; weightUnit: RawSet["unit"] }): RawSet => ({
  reps: s.reps,
  load: (s.weightUnit === "level" ? s.level : s.weight?.toString()) ?? "",
  unit: s.weightUnit,
});

// Ejercicios con historial, en orden alfabético.
export async function getMyTrackedExercises(): Promise<TrackedExercise[]> {
  const user = await getCurrentUser();
  const exercises = await prisma.exercise.findMany({
    where: { userId: user.id, sets: { some: {} } },
    select: { id: true, name: true, archivedAt: true },
  });
  exercises.sort((a, b) => collator.compare(a.name, b.name));
  return exercises.map((e) => ({ id: e.id, name: e.name, archived: e.archivedAt !== null }));
}

// Historial completo (todas las fechas) de hasta MAX_COMPARED ejercicios del
// usuario. Los ids ajenos o inexistentes simplemente no aparecen.
export async function getMyExerciseHistories(ids: string[]): Promise<ExerciseHistory[]> {
  const user = await getCurrentUser();
  const wanted = [...new Set(ids)].slice(0, MAX_COMPARED);
  if (wanted.length === 0) return [];

  const [exercises, sets] = await Promise.all([
    prisma.exercise.findMany({
      where: { id: { in: wanted }, userId: user.id },
      select: { id: true, name: true, archivedAt: true },
    }),
    prisma.set.findMany({
      where: { exerciseId: { in: wanted }, session: { userId: user.id } },
      orderBy: [{ session: { date: "asc" } }, { setNumber: "asc" }],
      select: {
        exerciseId: true,
        reps: true,
        weight: true,
        level: true,
        weightUnit: true,
        session: { select: { date: true, originRoutine: { select: { name: true } } } },
      },
    }),
  ]);

  const histories = new Map<string, ExerciseHistory>(
    exercises.map((e) => [e.id, { id: e.id, name: e.name, archived: e.archivedAt !== null, sessions: [] }]),
  );
  for (const set of sets) {
    const history = histories.get(set.exerciseId);
    if (!history) continue;
    const date = toIsoDate(set.session.date);
    let session = history.sessions.at(-1);
    if (session?.date !== date) {
      session = { date, title: set.session.originRoutine?.name ?? FREE_SESSION_TITLE, sets: [] };
      history.sessions.push(session);
    }
    session.sets.push(toRawSet(set));
  }
  // En el orden pedido (define el color de cada ejercicio).
  return wanted.map((id) => histories.get(id)).filter((h): h is ExerciseHistory => h !== undefined);
}

// Todos los días con entrenamiento asignado del usuario (para la constancia).
export async function getMyTrainingDays(): Promise<TrainingDay[]> {
  const user = await getCurrentUser();
  const sessions = await prisma.workoutSession.findMany({
    where: { userId: user.id },
    orderBy: { date: "asc" },
    select: { date: true, originRoutine: { select: { name: true } }, _count: { select: { sets: true } } },
  });
  return sessions.map((s) => ({
    date: toIsoDate(s.date),
    title: s.originRoutine?.name ?? FREE_SESSION_TITLE,
    setCount: s._count.sets,
  }));
}

// Detalle de un día para la constancia: ejercicios con su nº de series y su mejor serie.
export async function getMyDayDetail(date: string): Promise<DayDetail | null> {
  const user = await getCurrentUser();
  const session = await prisma.workoutSession.findUnique({
    where: { userId_date: { userId: user.id, date: toUtcDate(date) } },
    select: {
      originRoutine: { select: { name: true } },
      exercises: { orderBy: { order: "asc" }, select: { exerciseId: true, exercise: { select: { name: true } } } },
      sets: {
        orderBy: { setNumber: "asc" },
        select: { exerciseId: true, reps: true, weight: true, level: true, weightUnit: true },
      },
    },
  });
  if (!session) return null;

  return {
    date,
    title: session.originRoutine?.name ?? FREE_SESSION_TITLE,
    setCount: session.sets.length,
    exercises: session.exercises.map((e) => {
      const sets = session.sets.filter((s) => s.exerciseId === e.exerciseId).map(toRawSet);
      return { name: e.exercise.name, setCount: sets.length, best: bestSet(sets) };
    }),
  };
}
