import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "./prisma";

export type CurrentUser = { id: string; email: string; createdAt: Date };

// Data Access Layer: única forma de obtener el usuario autenticado en el
// servidor. Llamar siempre dentro de un <Suspense> (Cache Components).
export async function getCurrentUser(): Promise<CurrentUser> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, createdAt: true },
  });
  if (!user) redirect("/salir");

  return user;
}
