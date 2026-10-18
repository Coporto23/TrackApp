"use client";

import { archiveExercise } from "@/actions/exercises";
import { IconButton } from "@/components/icon-button";
import { ArchiveIcon, EditIcon } from "@/components/icons";
import type { ExerciseItem } from "@/lib/data/exercises";

export function ExerciseRow({
  exercise,
  onEdit,
}: {
  exercise: ExerciseItem;
  onEdit: (exercise: ExerciseItem) => void;
}) {
  return (
    <li className="flex items-center gap-1 py-1">
      <span className="min-w-0 flex-1 truncate py-2 text-bone">{exercise.name}</span>
      <IconButton label={`Renombrar ${exercise.name}`} type="button" onClick={() => onEdit(exercise)}>
        <EditIcon className="h-5 w-5" />
      </IconButton>
      <form action={archiveExercise}>
        <input type="hidden" name="id" value={exercise.id} />
        <IconButton label={`Archivar ${exercise.name}`} tone="danger">
          <ArchiveIcon className="h-5 w-5" />
        </IconButton>
      </form>
    </li>
  );
}
