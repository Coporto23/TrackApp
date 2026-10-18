import "server-only";
import { FREE_SESSION_TITLE, type WeightUnitValue } from "../constants";
import { getCurrentUser } from "../dal";
import { toIsoDate, toUtcDate } from "../dates";
import { prisma } from "../prisma";

export type WeekSession = {
  id: string;
  date: string;
  title: string;
  isFree: boolean;
  exerciseCount: number;
  setCount: number;
};

// `load`: peso como texto ("82.5"; Prisma.Decimal no es serializable hacia el
// cliente) o, con unidad "level", el nivel tal cual ("5", "B").
export type LoggedSet = { id: string; setNumber: number; reps: number; load: string; unit: WeightUnitValue };

export type DayExercise = {
  id: string; // SessionExercise
  exerciseId: string;
  name: string;
  sets: LoggedSet[];
  // Última vez que se entrenó este ejercicio antes de este día (referencia de progresión).
  previous: { date: string; sets: Omit<LoggedSet, "id">[] } | null;
};

export type DaySession = {
  id: string;
  date: string;
  routine: { id: string; name: string } | null;
  exercises: DayExercise[];
  setCount: number;
  // La lista del día difiere de la plantilla (ofrece actualizar la plantilla).
  differsFromRoutine: boolean;
};

const SET_SELECT = { id: true, setNumber: true, reps: true, weight: true, level: true, weightUnit: true } as const;
type SetRow = {
  id: string;
  setNumber: number;
  reps: number;
  weight: { toString(): string } | null;
  level: string | null;
  weightUnit: WeightUnitValue;
};
const toPlainSet = (s: Omit<SetRow, "id">): Omit<LoggedSet, "id"> => ({
  setNumber: s.setNumber,
  reps: s.reps,
  load: (s.weightUnit === "level" ? s.level : s.weight?.toString()) ?? "",
  unit: s.weightUnit,
});
const toLoggedSet = (s: SetRow): LoggedSet => ({ id: s.id, ...toPlainSet(s) });

// Sesiones del usuario entre dos fechas (inclusive): resumen para las tarjetas
// de cada día de la semana.
export async function getMySessionsBetween(from: string, to: string): Promise<WeekSession[]> {
  const user = await getCurrentUser();
  const sessions = await prisma.workoutSession.findMany({
    where: { userId: user.id, date: { gte: toUtcDate(from), lte: toUtcDate(to) } },
    select: {
      id: true,
      date: true,
      originRoutine: { select: { name: true } },
      _count: { select: { exercises: true, sets: true } },
    },
  });
  return sessions.map((s) => ({
    id: s.id,
    date: toIsoDate(s.date),
    title: s.originRoutine?.name ?? FREE_SESSION_TITLE,
    isFree: s.originRoutine === null,
    exerciseCount: s._count.exercises,
    setCount: s._count.sets,
  }));
}

export async function getMySessionOn(date: string): Promise<DaySession | null> {
  const user = await getCurrentUser();
  const session = await prisma.workoutSession.findUnique({
    where: { userId_date: { userId: user.id, date: toUtcDate(date) } },
    select: {
      id: true,
      date: true,
      originRoutine: {
        select: {
          id: true,
          name: true,
          exercises: {
            where: { exercise: { archivedAt: null } },
            orderBy: { order: "asc" },
            select: { exerciseId: true },
          },
        },
      },
      exercises: {
        orderBy: { order: "asc" },
        select: { id: true, exerciseId: true, exercise: { select: { name: true } } },
      },
      sets: { orderBy: { setNumber: "asc" }, select: { ...SET_SELECT, exerciseId: true } },
    },
  });
  if (!session) return null;

  const setsByExercise = new Map<string, LoggedSet[]>();
  for (const set of session.sets) {
    const list = setsByExercise.get(set.exerciseId) ?? [];
    list.push(toLoggedSet(set));
    setsByExercise.set(set.exerciseId, list);
  }
  const dayIds = session.exercises.map((e) => e.exerciseId);

  // Por ejercicio, la sesión anterior más reciente en que tuvo series.
  const previous = await Promise.all(
    dayIds.map((exerciseId) =>
      prisma.workoutSession.findFirst({
        where: { userId: user.id, date: { lt: session.date }, sets: { some: { exerciseId } } },
        orderBy: { date: "desc" },
        select: { date: true, sets: { where: { exerciseId }, orderBy: { setNumber: "asc" }, select: SET_SELECT } },
      }),
    ),
  );
  const routineIds = session.originRoutine?.exercises.map((e) => e.exerciseId) ?? [];

  return {
    id: session.id,
    date: toIsoDate(session.date),
    routine: session.originRoutine && { id: session.originRoutine.id, name: session.originRoutine.name },
    exercises: session.exercises.map((e, i) => {
      const prev = previous[i];
      return {
        id: e.id,
        exerciseId: e.exerciseId,
        name: e.exercise.name,
        sets: setsByExercise.get(e.exerciseId) ?? [],
        previous: prev && {
          date: toIsoDate(prev.date),
          sets: prev.sets.map(toPlainSet),
        },
      };
    }),
    setCount: session.sets.length,
    differsFromRoutine:
      session.originRoutine !== null && dayIds.join(",") !== routineIds.join(","),
  };
}
