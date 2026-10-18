import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { DEFAULT_EXERCISES } from "./default-exercises";

type DbClient = PrismaClient | Prisma.TransactionClient;

// Copia los ejercicios base al usuario indicado. Se invoca justo después de
// crear el usuario (idealmente en la misma transacción del registro, Fase 2).
// Es idempotente: skipDuplicates respeta el único (userId, name).
export async function seedUserExercises(db: DbClient, userId: string) {
  const { count } = await db.exercise.createMany({
    data: DEFAULT_EXERCISES.map((name) => ({ name, userId })),
    skipDuplicates: true,
  });
  return count;
}
