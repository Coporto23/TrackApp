"use client";

import { useState } from "react";
import { addSessionExercises, removeSessionExercise, reorderSessionExercises } from "@/actions/sessions";
import { ExercisePickerDialog } from "@/components/exercise-picker-dialog";
import { IconButton } from "@/components/icon-button";
import { PlusIcon, TrashIcon } from "@/components/icons";
import { SortableExerciseList } from "@/components/sortable-exercise-list";
import { FREE_SESSION_TITLE } from "@/lib/constants";
import type { ExerciseItem } from "@/lib/data/exercises";
import type { DayExercise, DaySession } from "@/lib/data/sessions";
import { DeleteSessionDialog } from "./delete-session-dialog";
import { SetLogger } from "./set-logger";
import { UpdateTemplateDialog } from "./update-template-dialog";

export const seriesLabel = (n: number) => (n === 1 ? "1 serie" : `${n} series`);
export const exercisesLabel = (n: number) => (n === 1 ? "1 ejercicio" : `${n} ejercicios`);

type Row = { id: string; name: string; note?: string; exercise: DayExercise };

// Tarjeta desplegada del día seleccionado. Los ejercicios vienen de la rutina
// como plantilla y se ajustan libremente para este día; cada uno se despliega
// para registrar sus series.
export function SessionDetails({ session, exercises }: { session: DaySession; exercises: ExerciseItem[] }) {
  const [dialog, setDialog] = useState<"add" | "delete" | "template" | null>(null);
  const close = () => setDialog(null);
  const title = session.routine?.name ?? FREE_SESSION_TITLE;
  const count = session.exercises.length;
  const rows: Row[] = session.exercises.map((e) => ({
    id: e.id,
    name: e.name,
    note: e.sets.length > 0 ? seriesLabel(e.sets.length) : "Sin series",
    exercise: e,
  }));

  return (
    <div className="facet border-l-2 border-ember bg-ash/90 px-3 py-3">
      <div className="mb-2 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className={`truncate font-display text-base font-bold ${session.routine ? "text-bone" : "text-ember-bright"}`}>
            {title}
          </p>
          <p className="text-xs text-fog">
            {exercisesLabel(count)} · {seriesLabel(session.setCount)}
          </p>
        </div>
        <IconButton label="Eliminar entrenamiento" type="button" tone="danger" onClick={() => setDialog("delete")}>
          <TrashIcon className="h-5 w-5" />
        </IconButton>
      </div>

      <div className="mb-1 flex items-center justify-between border-t border-stone-edge pt-2">
        <p className="font-display text-[11px] tracking-[0.15em] text-fog uppercase">Ejercicios · {count}</p>
        <button
          type="button"
          aria-label="Agregar ejercicios al día"
          title="Agregar ejercicios al día"
          onClick={() => setDialog("add")}
          className="btn-ember h-9 w-9! p-0!"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>

      {count === 0 ? (
        <p className="py-4 text-center text-sm text-fog">Sin ejercicios. Agrégalos con «+».</p>
      ) : (
        <>
          <SortableExerciseList
            key={session.exercises.map((e) => e.id).join(",")}
            dndId={`session-${session.id}`}
            items={rows}
            onReorder={(ids) => reorderSessionExercises(session.id, ids)}
            removeAction={removeSessionExercise}
            removeLabel={(name) => `Quitar ${name} de este día`}
            removeBlockedReason={(row) =>
              row.exercise.sets.length > 0 ? `Elimina las series de ${row.name} para quitarlo` : undefined
            }
            renderDetail={(row) => <SetLogger sessionId={session.id} exercise={row.exercise} />}
          />
          <p className="mt-2 text-center text-xs text-fog">Toca un ejercicio para registrar sus series.</p>
        </>
      )}

      {session.routine && session.differsFromRoutine && (
        <button
          type="button"
          onClick={() => setDialog("template")}
          className="mt-3 w-full py-2 text-center text-xs text-fog underline decoration-stone-edge underline-offset-4 hover:text-bone"
        >
          Actualizar plantilla «{session.routine.name}» con este día…
        </button>
      )}

      {dialog === "add" && (
        <ExercisePickerDialog
          addAction={addSessionExercises}
          hiddenFields={{ sessionId: session.id }}
          exercises={exercises}
          alreadyAdded={new Set(session.exercises.map((e) => e.exerciseId))}
          onClose={close}
        />
      )}
      {dialog === "delete" && <DeleteSessionDialog session={session} onClose={close} />}
      {dialog === "template" && session.routine && (
        <UpdateTemplateDialog sessionId={session.id} routineName={session.routine.name} onClose={close} />
      )}
    </div>
  );
}
