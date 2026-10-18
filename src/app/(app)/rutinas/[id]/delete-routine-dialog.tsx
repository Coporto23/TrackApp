"use client";

import { useFormStatus } from "react-dom";
import { deleteRoutine } from "@/actions/routines";
import { Modal } from "@/components/modal";

export function DeleteRoutineDialog({
  routine,
  onClose,
}: {
  routine: { id: string; name: string };
  onClose: () => void;
}) {
  return (
    <Modal title="¿Eliminar rutina?" onClose={onClose}>
      <form action={deleteRoutine} className="space-y-4">
        <input type="hidden" name="id" value={routine.id} />
        <p className="text-bone">
          Se eliminará la plantilla «<span className="text-ember-bright">{routine.name}</span>».
        </p>
        <p className="text-sm text-fog">
          Los entrenamientos que ya registraste con ella y sus series se conservan.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <DeleteButton />
        </div>
      </form>
    </Modal>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-danger" disabled={pending}>
      {pending ? "Eliminando…" : "Eliminar"}
    </button>
  );
}
