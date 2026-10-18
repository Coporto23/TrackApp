"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Modal sobre <dialog> nativo: atrapa el foco, cierra con Esc y bloquea el fondo.
// Se monta solo mientras está abierto, así su contenido parte limpio cada vez.
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  // Sin cleanup que llame a close(): en Strict Mode (dev) React monta, desmonta y
  // vuelve a montar; ese close() dispararía onClose y cerraría el modal al abrirlo.
  // Al desmontar, quitar el <dialog> del DOM ya lo saca de la capa superior.
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="m-auto w-[calc(100%-2.5rem)] max-w-sm bg-transparent p-0 text-bone backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <div className="facet bg-stone-edge p-px">
        <div className="facet bg-stone p-5">
          <h2 id="modal-title" className="mb-4 font-display text-lg font-bold tracking-[0.12em] text-gold">
            {title}
          </h2>
          {children}
        </div>
      </div>
    </dialog>
  );
}
