import { Panel } from "./panel";

// Marcador para secciones que se construyen en fases posteriores.
export function ComingSoon({ phase, description }: { phase: string; description: string }) {
  return (
    <Panel className="text-center">
      <p className="font-display text-xs tracking-[0.2em] text-ember uppercase">Sendero sellado</p>
      <p className="mt-3 text-bone">{description}</p>
      <p className="mt-2 text-sm text-fog">Disponible en la {phase}.</p>
    </Panel>
  );
}
