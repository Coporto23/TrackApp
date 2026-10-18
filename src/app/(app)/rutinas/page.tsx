import type { Metadata } from "next";
import { Suspense } from "react";
import { BackLink } from "@/components/back-link";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { getMyRoutines } from "@/lib/data/routines";
import { RoutineList } from "./routine-list";

export const metadata: Metadata = { title: "Rutinas" };

export default function RoutinesPage() {
  return (
    <>
      <BackLink href="/" label="Inicio" />
      <PageHeader title="Rutinas" subtitle="Tus plantillas de entrenamiento." />
      <Suspense fallback={<p className="text-fog">Desenrollando pergaminos…</p>}>
        <Routines />
      </Suspense>
    </>
  );
}

async function Routines() {
  const routines = await getMyRoutines();
  return (
    <Panel className="py-3!">
      <RoutineList routines={routines} />
    </Panel>
  );
}
