import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BackLink } from "@/components/back-link";
import { getMyExercises } from "@/lib/data/exercises";
import { getMyRoutine } from "@/lib/data/routines";
import { RoutineEditor } from "./routine-editor";

export const metadata: Metadata = { title: "Rutina" };

export default function RoutinePage({ params }: PageProps<"/rutinas/[id]">) {
  return (
    <>
      <BackLink href="/rutinas" label="Rutinas" />
      <Suspense fallback={<p className="text-fog">Desenrollando el pergamino…</p>}>
        <Routine params={params} />
      </Suspense>
    </>
  );
}

async function Routine({ params }: { params: PageProps<"/rutinas/[id]">["params"] }) {
  const { id } = await params;
  const [routine, { active }] = await Promise.all([getMyRoutine(id), getMyExercises()]);
  if (!routine) notFound();

  return <RoutineEditor routine={routine} availableExercises={active} />;
}
