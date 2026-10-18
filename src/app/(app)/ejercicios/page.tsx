import type { Metadata } from "next";
import { Suspense } from "react";
import { restoreExercise } from "@/actions/exercises";
import { BackLink } from "@/components/back-link";
import { IconButton } from "@/components/icon-button";
import { RestoreIcon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { getMyExercises } from "@/lib/data/exercises";
import { ExerciseList } from "./exercise-list";

export const metadata: Metadata = { title: "Ejercicios" };

export default function ExercisesPage() {
  return (
    <>
      <BackLink href="/" label="Inicio" />
      <PageHeader title="Ejercicios" subtitle="Tu arsenal personal." />
      <Suspense fallback={<p className="text-fog">Abriendo el arsenal…</p>}>
        <Exercises />
      </Suspense>
    </>
  );
}

async function Exercises() {
  const { active, archived } = await getMyExercises();

  return (
    <div className="space-y-4">
      <Panel className="py-3!">
        <ExerciseList exercises={active} />
      </Panel>

      {archived.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none py-2 font-display text-xs tracking-[0.15em] text-fog uppercase hover:text-bone">
            <span className="mr-2 inline-block transition-transform group-open:rotate-90">›</span>
            Archivados · {archived.length}
          </summary>
          <p className="mb-2 text-sm text-fog">
            Conservan su historial de series. Restáuralos para volver a usarlos.
          </p>
          <ul className="divide-y divide-stone-edge/70">
            {archived.map((exercise) => (
              <li key={exercise.id} className="flex items-center gap-1 py-1">
                <span className="min-w-0 flex-1 truncate py-2 text-fog line-through decoration-stone-edge">
                  {exercise.name}
                </span>
                <form action={restoreExercise}>
                  <input type="hidden" name="id" value={exercise.id} />
                  <IconButton label={`Restaurar ${exercise.name}`} tone="ember">
                    <RestoreIcon className="h-5 w-5" />
                  </IconButton>
                </form>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
