"use client";

import { useActionState, useState } from "react";
import { createRoutine, type RoutineFormState } from "@/actions/routines";
import { createSession, type SessionFormState } from "@/actions/sessions";
import { PlusIcon } from "@/components/icons";
import { Modal } from "@/components/modal";
import { formatLongDate } from "@/lib/dates";
import type { RoutineSummary } from "@/lib/data/routines";
import { FREE_SESSION_TITLE } from "@/lib/constants";

// Valor del radio para "Entrenamiento libre" (createSession lo recibe vacío).
const FREE = "";

// Asigna una rutina (o entrenamiento libre) a un día. Permite crear una rutina
// nueva sin salir del calendario: vuelve a la lista con ella seleccionada.
export function AssignRoutineDialog({
  date,
  routines,
  onClose,
  onAssigned,
}: {
  date: string;
  routines: RoutineSummary[];
  onClose: () => void;
  onAssigned?: (date: string) => void;
}) {
  const [view, setView] = useState<"pick" | "create">("pick");
  const [choice, setChoice] = useState<string | null>(null);

  return (
    <Modal title={view === "pick" ? `Asignar · ${formatLongDate(date)}` : "Nueva rutina"} onClose={onClose}>
      {view === "pick" ? (
        <PickRoutine
          date={date}
          onAssigned={onAssigned}
          routines={routines}
          choice={choice}
          onChoose={setChoice}
          onCreateNew={() => setView("create")}
          onClose={onClose}
        />
      ) : (
        <CreateRoutine
          onCreated={(id) => {
            setChoice(id);
            setView("pick");
          }}
          onCancel={() => setView("pick")}
        />
      )}
    </Modal>
  );
}

function PickRoutine({
  date,
  onAssigned,
  routines,
  choice,
  onChoose,
  onCreateNew,
  onClose,
}: {
  date: string;
  onAssigned?: (date: string) => void;
  routines: RoutineSummary[];
  choice: string | null;
  onChoose: (id: string) => void;
  onCreateNew: () => void;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(
    async (prev: SessionFormState, formData: FormData) => {
      const result = await createSession(prev, formData);
      if (result?.ok) {
        onClose();
        onAssigned?.(date);
      }
      return result;
    },
    undefined,
  );

  const options = [
    { id: FREE, name: FREE_SESSION_TITLE, detail: "Sin plantilla: agrega ejercicios sobre la marcha" },
    ...routines.map((r) => ({
      id: r.id,
      name: r.name,
      detail: r.exerciseCount === 1 ? "1 ejercicio" : `${r.exerciseCount} ejercicios`,
    })),
  ];

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="date" value={date} />
      <fieldset>
        <legend className="sr-only">Rutina para este día</legend>
        <ul className="-mx-1 max-h-[45dvh] divide-y divide-stone-edge/70 overflow-y-auto px-1">
          {options.map((option) => {
            const checked = choice === option.id;
            return (
              <li key={option.id || "free"}>
                {/* relative: ancla el radio sr-only a su fila (ver Gotchas de UI). */}
                <label className="relative flex cursor-pointer items-center gap-3 py-3 pl-1">
                  <input
                    type="radio"
                    name="routineId"
                    value={option.id}
                    className="peer sr-only"
                    checked={checked}
                    onChange={() => onChoose(option.id)}
                  />
                  <span
                    aria-hidden
                    className={`flex h-5 w-5 shrink-0 rotate-45 items-center justify-center border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ember ${
                      checked ? "border-ember" : "border-stone-edge bg-ash"
                    }`}
                  >
                    {checked && <span className="h-2.5 w-2.5 bg-ember" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate ${option.id === FREE ? "text-ember-bright" : "text-bone"}`}>
                      {option.name}
                    </span>
                    <span className="block text-xs text-fog">{option.detail}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <button
        type="button"
        onClick={onCreateNew}
        className="flex w-full items-center justify-center gap-2 border border-dashed border-stone-edge py-2.5 text-sm text-ember-bright transition-colors hover:border-ember"
      >
        <PlusIcon className="h-4 w-4" />
        Crear rutina nueva
      </button>

      {state?.error && (
        <p role="alert" className="text-sm text-blood">
          {state.error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 pt-1">
        <button type="button" className="btn-ghost" onClick={onClose}>
          Cancelar
        </button>
        <button type="submit" className="btn-ember" disabled={pending || choice === null}>
          {pending ? "Asignando…" : "Aceptar"}
        </button>
      </div>
    </form>
  );
}

function CreateRoutine({
  onCreated,
  onCancel,
}: {
  onCreated: (routineId: string) => void;
  onCancel: () => void;
}) {
  const [state, action, pending] = useActionState(
    async (prev: RoutineFormState, formData: FormData) => {
      const result = await createRoutine(prev, formData);
      if (result?.routine) onCreated(result.routine.id);
      return result;
    },
    undefined,
  );

  return (
    <form action={action} className="space-y-4">
      <p className="text-sm text-fog">
        Se guardará en tus rutinas. Luego podrás agregarle ejercicios desde este mismo día.
      </p>
      <div className="space-y-1.5">
        <label
          htmlFor="calendar-routine-name"
          className="block font-display text-xs tracking-[0.15em] text-fog uppercase"
        >
          Nombre
        </label>
        <input
          id="calendar-routine-name"
          name="name"
          className="field"
          placeholder="Ej. Día Pierna"
          autoComplete="off"
          maxLength={60}
          autoFocus
          defaultValue={state?.name}
          aria-invalid={Boolean(state?.error)}
          aria-describedby={state?.error ? "calendar-routine-name-error" : undefined}
        />
        {state?.error && (
          <p id="calendar-routine-name-error" role="alert" className="text-sm text-blood">
            {state.error}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn-ember" disabled={pending}>
          {pending ? "Guardando…" : "Aceptar"}
        </button>
      </div>
    </form>
  );
}
