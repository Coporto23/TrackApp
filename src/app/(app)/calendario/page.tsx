import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { isIsoDate, weekDays } from "@/lib/dates";
import { getMyExercises } from "@/lib/data/exercises";
import { getMyRoutines } from "@/lib/data/routines";
import { getMySessionOn, getMySessionsBetween } from "@/lib/data/sessions";
import { GoToToday } from "./go-to-today";
import { WeekView } from "./week-view";

export const metadata: Metadata = { title: "Calendario" };

export default function CalendarPage({ searchParams }: PageProps<"/calendario">) {
  return (
    <>
      <PageHeader title="Calendario" subtitle="Tus jornadas de entrenamiento." />
      <Suspense fallback={<p className="text-fog">Consultando el calendario…</p>}>
        <Calendar searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Calendar({ searchParams }: { searchParams: PageProps<"/calendario">["searchParams"] }) {
  const { d } = await searchParams;
  // El día seleccionado vive en la URL (?d=YYYY-MM-DD). Sin él, se va a "hoy"
  // según el reloj del navegador (el servidor no conoce la zona del usuario).
  if (!isIsoDate(d)) return <GoToToday />;

  const days = weekDays(d);
  const [weekSessions, selectedSession, routines, { active }] = await Promise.all([
    getMySessionsBetween(days[0], days[6]),
    getMySessionOn(d),
    getMyRoutines(),
    getMyExercises(),
  ]);

  return (
    <WeekView
      selected={d}
      days={days}
      weekSessions={weekSessions}
      selectedSession={selectedSession}
      routines={routines}
      exercises={active}
    />
  );
}
