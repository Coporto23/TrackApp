"use client";

import { useActionState } from "react";
import { createRoutine, renameRoutine, type RoutineFormState } from "@/actions/routines";
import { Modal } from "@/components/modal";

// Modal para crear una rutina (sin `routine`) o renombrarla (con `routine`).
export function RoutineNameDialog({
  routine,
  onClose,
}: {
  routine?: { id: string; name: string };
  onClose: () => void;
}) {
  const isEdit = Boolean(routine);
  const [state, action, pending] = useActionState(
    async (prev: RoutineFormState, formData: FormData) => {
      const result = await (isEdit ? renameRoutine : createRoutine)(prev, formData);
      if (result?.ok) onClose();
      return result;
    },
    undefined,
  );

  return (
    <Modal title={isEdit ? "Renombrar rutina" : "Nueva rutina"} onClose={onClose}>
      <form action={action} className="space-y-4">
        {routine && <input type="hidden" name="id" value={routine.id} />}
        <div className="space-y-1.5">
          <label
            htmlFor="routine-name"
            className="block font-display text-xs tracking-[0.15em] text-fog uppercase"
          >
            Nombre
          </label>
          <input
            id="routine-name"
            name="name"
            className="field"
            placeholder="Ej. Día Pecho"
            autoComplete="off"
            maxLength={60}
            autoFocus
            defaultValue={state?.name ?? routine?.name}
            aria-invalid={Boolean(state?.error)}
            aria-describedby={state?.error ? "routine-name-error" : undefined}
          />
          {state?.error && (
            <p id="routine-name-error" role="alert" className="text-sm text-blood">
              {state.error}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn-ember" disabled={pending}>
            {pending ? "Guardando…" : "Aceptar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
