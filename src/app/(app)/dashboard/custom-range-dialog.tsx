"use client";

import { useState, type FormEvent } from "react";
import { Modal } from "@/components/modal";
import type { Span } from "@/lib/progress";

// Rango personalizado: Desde / Hasta con el selector de fecha nativo (en el
// celular abre el del sistema). Hasta no puede ser posterior a hoy.
export function CustomRangeDialog({
  initial,
  today,
  onAccept,
  onClose,
}: {
  initial: Span;
  today: string;
  onAccept: (span: Span) => void;
  onClose: () => void;
}) {
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [error, setError] = useState<string | null>(null);

  function accept(e: FormEvent) {
    e.preventDefault();
    if (!from || !to) return setError("Elige ambas fechas.");
    if (from > to) return setError("«Desde» debe ser anterior o igual a «Hasta».");
    if (to > today) return setError("«Hasta» no puede ser posterior a hoy.");
    onAccept({ from, to });
    onClose();
  }

  return (
    <Modal title="Rango personalizado" onClose={onClose}>
      <form onSubmit={accept} className="space-y-4" noValidate>
        {(
          [
            ["range-from", "Desde", from, setFrom],
            ["range-to", "Hasta", to, setTo],
          ] as const
        ).map(([id, label, value, setValue]) => (
          <div key={id} className="space-y-1.5">
            <label htmlFor={id} className="block font-display text-xs tracking-[0.15em] text-fog uppercase">
              {label}
            </label>
            <input
              id={id}
              type="date"
              className="field"
              value={value}
              max={today}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "range-error" : undefined}
            />
          </div>
        ))}
        {error && (
          <p id="range-error" role="alert" className="text-sm text-blood">
            {error}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn-ember">
            Aceptar
          </button>
        </div>
      </form>
    </Modal>
  );
}
