"use client";

import { useFormStatus } from "react-dom";
import { deleteSession } from "@/actions/sessions";
import { Modal } from "@/components/modal";
import { formatLongDate } from "@/lib/dates";
import type { DaySession } from "@/lib/data/sessions";

export function DeleteSessionDialog({ session, onClose }: { session: DaySession; onClose: () => void }) {
  async function remove(formData: FormData) {
    await deleteSession(formData);
    onClose();
  }

  return (
    <Modal title="¿Eliminar entrenamiento?" onClose={onClose}>
      <form action={remove} className="space-y-4">
        <input type="hidden" name="id" value={session.id} />
        <p className="text-bone">
          Se eliminará el entrenamiento del{" "}
          <span className="text-ember-bright">{formatLongDate(session.date)}</span>.
        </p>
        <p className="text-sm text-fog">
          {session.setCount > 0
            ? `Se borrarán también sus ${session.setCount} series registradas. Esta acción no se puede deshacer.`
            : "Esta acción no se puede deshacer. Tus rutinas no se modifican."}
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
