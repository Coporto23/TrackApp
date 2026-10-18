import type { ReactNode } from "react";

// Tarjeta biselada con borde: una capa exterior del color del borde y una
// interior del fondo, ambas recortadas con el mismo bisel.
export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className="facet bg-stone-edge p-px">
      <div className={`facet bg-stone/95 p-5 ${className}`}>{children}</div>
    </div>
  );
}
