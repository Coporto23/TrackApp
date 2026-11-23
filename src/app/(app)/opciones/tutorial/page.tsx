import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { ComingSoon } from "@/components/coming-soon";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Documentación" };

export default function TutorialPage() {
  return (
    <>
      <BackLink href="/opciones" label="Más opciones" />
      <PageHeader title="Documentación" />
      <ComingSoon phase="próxima iteración" description="Aquí encontrarás una guía para usar TrackApp." />
    </>
  );
}
