import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Calendario" };

export default function CalendarPage() {
  return (
    <>
      <PageHeader title="Calendario" subtitle="Tus jornadas de entrenamiento." />
      <ComingSoon phase="Fase 4" description="Selecciona un día y carga una rutina." />
    </>
  );
}
