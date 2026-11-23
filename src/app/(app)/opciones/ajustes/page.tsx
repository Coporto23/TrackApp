import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { ComingSoon } from "@/components/coming-soon";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Ajustes" };

export default function SettingsPage() {
  return (
    <>
      <BackLink href="/opciones" label="Más opciones" />
      <PageHeader title="Ajustes" />
      <ComingSoon phase="próxima iteración" description="Aquí podrás ajustar las preferencias de la aplicación." />
    </>
  );
}
