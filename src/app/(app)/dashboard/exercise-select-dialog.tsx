"use client";

import { useState } from "react";
import { CheckIcon, SearchIcon } from "@/components/icons";
import { Modal } from "@/components/modal";
import type { TrackedExercise } from "@/lib/data/dashboard";

const normalize = (text: string) =>
  text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

// Selector de ejercicios a comparar: solo los que tienen series (incluye
// archivados). Permite elegir hasta `max` más de los ya elegidos.
export function ExerciseSelectDialog({
  exercises,
  chosen,
  max,
  onAccept,
  onClose,
}: {
  exercises: TrackedExercise[];
  chosen: Set<string>;
  max: number;
  onAccept: (ids: string[]) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const full = selected.length >= max;

  const q = normalize(query.trim());
  const visible = q ? exercises.filter((e) => normalize(e.name).includes(q)) : exercises;
  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <Modal title="Comparar ejercicios" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          onAccept(selected);
          onClose();
        }}
      >
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-fog" />
          <label htmlFor="compare-search" className="sr-only">
            Buscar ejercicio
          </label>
          <input
            id="compare-search"
            type="search"
            className="field py-2! pl-9!"
            placeholder="Buscar…"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <p className="text-xs text-fog">
          {full
            ? `Máximo ${max === 1 ? "1 ejercicio más" : `${max} ejercicios más`} (hasta 4 a la vez).`
            : "Solo aparecen los ejercicios con series registradas."}
        </p>

        <ul className="-mx-1 max-h-[42dvh] divide-y divide-stone-edge/70 overflow-y-auto px-1">
          {visible.length === 0 && (
            <li className="py-4 text-center text-sm text-fog">Ningún ejercicio coincide con «{query}».</li>
          )}
          {visible.map((exercise) => {
            const added = chosen.has(exercise.id);
            const checked = added || selected.includes(exercise.id);
            const disabled = added || (full && !checked);
            return (
              <li key={exercise.id}>
                {/* relative: ancla el checkbox sr-only a su fila (ver Gotchas). */}
                <label
                  className={`relative flex items-center gap-3 py-3 pl-1 ${disabled ? "cursor-default text-fog" : "cursor-pointer text-bone"}`}
                >
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggle(exercise.id)}
                  />
                  <span
                    aria-hidden
                    className={`flex h-5 w-5 shrink-0 rotate-45 items-center justify-center border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ember ${
                      checked ? "border-ember bg-ember text-abyss" : "border-stone-edge bg-ash"
                    } ${disabled ? "opacity-50" : ""}`}
                  >
                    {checked && <CheckIcon className="h-3.5 w-3.5 -rotate-45" strokeWidth={2.5} />}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{exercise.name}</span>
                  {added ? (
                    <span className="text-xs text-fog">Elegido</span>
                  ) : (
                    exercise.archived && <span className="text-xs text-fog">archivado</span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn-ember px-2! tracking-[0.12em]! whitespace-nowrap" disabled={selected.length === 0}>
            {selected.length > 0 ? `Aceptar (${selected.length})` : "Aceptar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
