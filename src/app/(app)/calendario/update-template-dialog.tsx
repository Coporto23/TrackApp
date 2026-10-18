"use client";

import { useFormStatus } from "react-dom";
import { saveSessionToRoutine } from "@/actions/sessions";
import { Modal } from "@/components/modal";

// Opción secundaria: reemplazar los ejercicios de la plantilla por los de este día.
export function UpdateTemplateDialog({
  sessionId,
  routineName,
  onClose,
}: {
  sessionId: string;
  routineName: string;
  onClose: () => void;
}) {
  async function save(formData: FormData) {
    await saveSessionToRoutine(formData);
    onClose();
  }

  return (
    <Modal title="¿Actualizar plantilla?" onClose={onClose}>
      <form action={save} className="space-y-4">
        <input type="hidden" name="id" value={sessionId} />
        <p className="text-bone">
          La rutina «<span className="text-ember-bright">{routineName}</span>» quedará con los ejercicios y el
          orden de este día.
        </p>
        <p className="text-sm text-fog">
          Solo afecta a los días que asignes desde ahora; los ya creados no cambian.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <SubmitButton />
        </div>
      </form>
    </Modal>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-ember" disabled={pending}>
      {pending ? "Guardando…" : "Actualizar"}
    </button>
  );
}
