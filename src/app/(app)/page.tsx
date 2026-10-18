import Link from "next/link";
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
        <ComingSoon phase="Fase 4" description="Aquí podrás iniciar la sesión de entrenamiento de hoy." />
        <Suspense fallback={<p className="text-fog">Avivando las brasas…</p>}>
          <Shortcuts />
        </Suspense>
      </div>
    </>
  );
}

async function Shortcuts() {
  const user = await getCurrentUser();
  const [exerciseCount, routineCount] = await Promise.all([
    prisma.exercise.count({ where: { userId: user.id, archivedAt: null } }),
    prisma.routine.count({ where: { userId: user.id } }),
  ]);

  return (
    <div className="grid grid-cols-2 gap-3">
      <ShortcutCard href="/ejercicios" label="Ejercicios" count={exerciseCount} />
      <ShortcutCard href="/rutinas" label="Rutinas" count={routineCount} />
    </div>
  );
}

function ShortcutCard({
  href,
  label,
  count,
}: {
  href: "/ejercicios" | "/rutinas";
  label: string;
  count: number;
}) {
  const content = (
    <div className="facet bg-stone-edge p-px transition-colors group-hover:bg-ember-deep">
      <div className="facet flex h-full flex-col bg-stone/95 px-4 py-4">
        <span className="font-display text-xs tracking-[0.15em] text-fog uppercase">{label}</span>
        <span className="mt-2 font-display text-3xl font-bold text-gold">{count}</span>
        <span className="mt-1 text-xs text-fog">Gestionar ›</span>
      </div>
    </div>
  );

  return (
    <Link href={href} className="group block">
      {content}
    </Link>
  );
}
