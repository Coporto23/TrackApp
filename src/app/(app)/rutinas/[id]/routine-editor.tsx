"use client";

import { useState } from "react";
import {
  addRoutineExercises,
  removeRoutineExercise,
  reorderRoutineExercises,
} from "@/actions/routines";
import { ExercisePickerDialog } from "@/components/exercise-picker-dialog";
import { IconButton } from "@/components/icon-button";
import { EditIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { SortableExerciseList } from "@/components/sortable-exercise-list";
import type { ExerciseItem } from "@/lib/data/exercises";
import type { RoutineDetail } from "@/lib/data/routines";
import { RoutineNameDialog } from "../routine-name-dialog";
import { DeleteRoutineDialog } from "./delete-routine-dialog";

type DialogState = "rename" | "delete" | "add" | null;

export function RoutineEditor({
  routine,
  availableExercises,
}: {
  routine: RoutineDetail;
  availableExercises: ExerciseItem[];
}) {
  const [dialog, setDialog] = useState<DialogState>(null);
  const close = () => setDialog(null);
  const count = routine.exercises.length;

  return (
    <>
      <div className="flex items-start gap-1">
        <div className="min-w-0 flex-1">
          <PageHeader
            title={routine.name}
            subtitle={count === 1 ? "1 ejercicio" : `${count} ejercicios`}
          />
        </div>
        <IconButton label="Renombrar rutina" type="button" onClick={() => setDialog("rename")}>
          <EditIcon className="h-5 w-5" />
        </IconButton>
        <IconButton label="Eliminar rutina" type="button" tone="danger" onClick={() => setDialog("delete")}>
          <TrashIcon className="h-5 w-5" />
        </IconButton>
      </div>

      <Panel className="py-3!">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display text-xs tracking-[0.15em] text-fog uppercase">Ejercicios · {count}</p>
          <button
            type="button"
            aria-label="Agregar ejercicios"
            title="Agregar ejercicios"
            onClick={() => setDialog("add")}
            className="btn-ember h-10 w-10! p-0!"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        </div>

        {count === 0 ? (
          <p className="py-6 text-center text-fog">Rutina vacía. Agrega ejercicios con «+».</p>
        ) : (
          <>
            <SortableExerciseList
              // Remontar cuando el servidor devuelve otra lista/orden.
              key={routine.exercises.map((e) => e.id).join(",")}
              dndId={`routine-${routine.id}`}
              items={routine.exercises}
              onReorder={(ids) => reorderRoutineExercises(routine.id, ids)}
              removeAction={removeRoutineExercise}
              removeLabel={(name) => `Quitar ${name} de la rutina`}
            />
            <p className="mt-3 text-center text-xs text-fog">
              Arrastra desde la manija ⠿ para reordenar.
            </p>
          </>
        )}
      </Panel>

      {dialog === "rename" && <RoutineNameDialog routine={routine} onClose={close} />}
      {dialog === "delete" && <DeleteRoutineDialog routine={routine} onClose={close} />}
      {dialog === "add" && (
        <ExercisePickerDialog
          addAction={addRoutineExercises}
          hiddenFields={{ routineId: routine.id }}
          exercises={availableExercises}
          alreadyAdded={new Set(routine.exercises.map((e) => e.exerciseId))}
          onClose={close}
        />
      )}
    </>
  );
}
