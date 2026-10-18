import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" subtitle="Progresión de carga máxima." />
      <ComingSoon phase="Fase 5" description="Verás la evolución de tu peso máximo por ejercicio." />
    </>
  );
}
