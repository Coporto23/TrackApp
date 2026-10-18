import Link from "next/link";
import { Suspense } from "react";
import { BonfireIcon, ChevronRightIcon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export default function HomePage() {
  return (
    <>
      <PageHeader title="Inicio" subtitle="La hoguera está encendida." />
      <div className="space-y-4">
        <TrainTodayCard />
        <Suspense fallback={<p className="text-fog">Avivando las brasas…</p>}>
          <Shortcuts />
        </Suspense>
      </div>
    </>
  );
}

// Sin ?d el calendario abre "hoy" según el reloj del navegador.
function TrainTodayCard() {
  return (
    <Link href="/calendario" className="group block">
      <div className="facet bg-ember-deep p-px transition-colors group-hover:bg-ember">
        <div className="facet flex items-center gap-4 bg-stone/95 px-4 py-5">
          <BonfireIcon className="h-10 w-10 shrink-0 text-ember-bright drop-shadow-[0_0_8px_rgba(242,165,90,0.45)]" />
          <span className="min-w-0 flex-1">
            <span className="block font-display text-lg font-bold tracking-[0.1em] text-bone uppercase">
              Entrenar hoy
            </span>
            <span className="block text-sm text-fog">Asigna una rutina y prepara tu jornada.</span>
          </span>
          <ChevronRightIcon className="h-5 w-5 shrink-0 text-fog group-hover:text-ember-bright" />
        </div>
      </div>
    </Link>
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
