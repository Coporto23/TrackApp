import "server-only";
import { prisma } from "./prisma";
import { seedUserExercises } from "./seed-user-exercises";

// Único punto de creación de usuarios: crea la cuenta y copia los ejercicios
// base en una sola transacción. Lo reutilizará el login con Google (futuro).
export async function createUserWithDefaults(email: string, passwordHash: string) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, password: passwordHash },
      select: { id: true, email: true },
    });
    await seedUserExercises(tx, user.id);
    return user;
  });
}
