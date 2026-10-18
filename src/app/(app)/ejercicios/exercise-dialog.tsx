"use client";

import { useActionState } from "react";
import {
  createExercise,
  renameExercise,
  restoreExercise,
  type ExerciseFormState,
} from "@/actions/exercises";
import { Modal } from "@/components/modal";
import type { ExerciseItem } from "@/lib/data/exercises";

// Modal para crear un ejercicio (sin `exercise`) o renombrarlo (con `exercise`).
export function ExerciseDialog({
  exercise,
  onClose,
}: {
  exercise?: ExerciseItem;
  onClose: () => void;
}) {
  const isEdit = Boolean(exercise);
  const [state, action, pending] = useActionState(
    async (prev: ExerciseFormState, formData: FormData) => {
      const result = await (isEdit ? renameExercise : createExercise)(prev, formData);
      if (result?.ok) onClose();
      return result;
    },
    undefined,
  );

  async function restore(formData: FormData) {
    await restoreExercise(formData);
    onClose();
  }

  return (
    <Modal title={isEdit ? "Renombrar ejercicio" : "Nuevo ejercicio"} onClose={onClose}>
      <form action={action} className="space-y-4">
        {exercise && <input type="hidden" name="id" value={exercise.id} />}
        <div className="space-y-1.5">
          <label
            htmlFor="exercise-name"
            className="block font-display text-xs tracking-[0.15em] text-fog uppercase"
          >
            Nombre
          </label>
          <input
            id="exercise-name"
            name="name"
            className="field"
            placeholder="Ej. Hip Thrust"
            autoComplete="off"
            maxLength={60}
            autoFocus
            defaultValue={state?.name ?? exercise?.name}
            aria-invalid={Boolean(state?.error)}
            aria-describedby={state?.error ? "exercise-name-error" : undefined}
          />
          {state?.error && (
            <p id="exercise-name-error" role="alert" className="text-sm text-blood">
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

      {state?.archivedMatch && (
        <form action={restore} className="mt-4 border-t border-stone-edge pt-4 text-sm text-fog">
          <input type="hidden" name="id" value={state.archivedMatch.id} />
          <p>
            Ya tienes «<span className="text-bone">{state.archivedMatch.name}</span>» archivado.
          </p>
          <button type="submit" className="mt-1 py-2 text-ember-bright hover:underline">
            Restaurarlo
          </button>
        </form>
      )}
    </Modal>
  );
}
