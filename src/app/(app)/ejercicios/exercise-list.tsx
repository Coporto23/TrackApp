"use client";

import { useState } from "react";
import { PlusIcon, SearchIcon } from "@/components/icons";
import type { ExerciseItem } from "@/lib/data/exercises";
import { ExerciseDialog } from "./exercise-dialog";
import { ExerciseRow } from "./exercise-row";

// Compara sin tildes ni mayúsculas: "press" encuentra "Press Francés".
const normalize = (text: string) =>
  text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

type DialogState = { mode: "create" } | { mode: "edit"; exercise: ExerciseItem } | null;

export function ExerciseList({ exercises }: { exercises: ExerciseItem[] }) {
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<DialogState>(null);
  const q = normalize(query.trim());
  const visible = q ? exercises.filter((e) => normalize(e.name).includes(q)) : exercises;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="font-display text-xs tracking-[0.15em] text-fog uppercase">
          Activos · {exercises.length}
        </p>
        <button
          type="button"
          aria-label="Añadir ejercicio"
          title="Añadir ejercicio"
          onClick={() => setDialog({ mode: "create" })}
          className="btn-ember h-10 w-10! p-0!"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>

      {exercises.length === 0 ? (
        <p className="py-6 text-center text-fog">Tu arsenal está vacío. Añade tu primer ejercicio con «+».</p>
      ) : (
        <>
          <div className="relative mb-2">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-fog" />
            <label htmlFor="exercise-search" className="sr-only">
              Buscar ejercicio
            </label>
            <input
              id="exercise-search"
              type="search"
              className="field py-2! pl-9!"
              placeholder="Buscar…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {visible.length === 0 ? (
            <p className="py-4 text-center text-sm text-fog">Ningún ejercicio coincide con «{query}».</p>
          ) : (
            <ul className="divide-y divide-stone-edge/70">
              {visible.map((exercise) => (
                <ExerciseRow
                  key={exercise.id}
                  exercise={exercise}
                  onEdit={(e) => setDialog({ mode: "edit", exercise: e })}
                />
              ))}
            </ul>
          )}
        </>
      )}

      {dialog && (
        <ExerciseDialog
          exercise={dialog.mode === "edit" ? dialog.exercise : undefined}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
