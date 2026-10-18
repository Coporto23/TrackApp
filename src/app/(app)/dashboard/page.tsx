import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { DASHBOARD_EXERCISES_COOKIE } from "@/lib/constants";
import { getMyExerciseHistories, getMyTrackedExercises, getMyTrainingDays } from "@/lib/data/dashboard";
import { MAX_COMPARED } from "@/lib/progress";
import { DashboardView } from "./dashboard-view";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <>
      <PageHeader title="Dashboard" subtitle="Tu progreso a lo largo del tiempo." />
      <Suspense fallback={<p className="text-fog">Leyendo tus crónicas…</p>}>
        <Dashboard searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Dashboard({ searchParams }: { searchParams: PageProps<"/dashboard">["searchParams"] }) {
  const [{ e }, cookieStore, exercises, trainingDays] = await Promise.all([
    searchParams,
    cookies(),
    getMyTrackedExercises(),
    getMyTrainingDays(),
  ]);

  // Ejercicios elegidos por posición (?e=id1,,id3: la posición fija el color).
  // Sin ?e= (p. ej. al volver desde la barra inferior) se restaura la última
  // selección guardada en la cookie; sin ella, ninguno. Ids ajenos o repetidos se descartan.
  const chosen = typeof e === "string" ? e : (cookieStore.get(DASHBOARD_EXERCISES_COOKIE)?.value ?? "");
  const known = new Set(exercises.map((x) => x.id));
  const seen = new Set<string>();
  const slots = (chosen ? chosen.split(",") : [])
    .slice(0, MAX_COMPARED)
    .map((id) => {
      if (!known.has(id) || seen.has(id)) return "";
      seen.add(id);
      return id;
    });

  const histories = await getMyExerciseHistories(slots.filter(Boolean));
  return <DashboardView exercises={exercises} slots={slots} histories={histories} trainingDays={trainingDays} />;
}
