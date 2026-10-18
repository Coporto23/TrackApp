import { Suspense } from "react";
import { ComingSoon } from "@/components/coming-soon";
import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export default function HomePage() {
  return (
    <>
      <PageHeader title="Inicio" subtitle="La hoguera está encendida." />
      <div className="space-y-4">
        <Suspense fallback={<p className="text-fog">Avivando las brasas…</p>}>
          <Welcome />
        </Suspense>
        <ComingSoon phase="Fase 4" description="Aquí podrás iniciar la sesión de entrenamiento de hoy." />
      </div>
    </>
  );
}

async function Welcome() {
  const user = await getCurrentUser();
  const exerciseCount = await prisma.exercise.count({
    where: { userId: user.id, archivedAt: null },
  });

  return (
    <p className="text-bone">
      Saludos, <span className="text-ember-bright">{user.email}</span>. Tienes{" "}
      <span className="font-bold text-gold">{exerciseCount}</span> ejercicios en tu arsenal.
    </p>
  );
}
