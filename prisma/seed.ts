// `npx prisma db seed`: asigna los ejercicios base a los usuarios existentes
// que aún no tienen ninguno. Los usuarios nuevos los reciben automáticamente
// al registrarse (ver seedUserExercises en el flujo de registro, Fase 2).
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { seedUserExercises } from "../src/lib/seed-user-exercises";

async function main() {
  const users = await prisma.user.findMany({
    where: { exercises: { none: {} } },
    select: { id: true, email: true },
  });

  for (const user of users) {
    const count = await seedUserExercises(prisma, user.id);
    console.log(`${user.email}: ${count} ejercicios creados`);
  }
  console.log(`Seed completado (${users.length} usuarios sin ejercicios).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
