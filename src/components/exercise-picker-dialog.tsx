"use client";

import { useActionState, useState } from "react";
import { createExercise, restoreExercise, type ExerciseFormState } from "@/actions/exercises";
import type { ExerciseItem } from "@/lib/data/exercises";
import { CheckIcon, PlusIcon, SearchIcon } from "./icons";
import { Modal } from "./modal";

type AddState = { error?: string; ok?: boolean } | undefined;
// Acción que agrega los ejercicios seleccionados (llegan como `exerciseIds`).
type AddAction = (prev: AddState, formData: FormData) => Promise<AddState>;

const normalize = (text: string) =>
  text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

// Selector para agregar ejercicios (a una rutina o a la sesión de un día). Tiene
// dos vistas en el mismo modal: elegir de la lista, o crear un ejercicio nuevo
// sin salir (queda en el arsenal y vuelve a la lista ya marcado).
export function ExercisePickerDialog({
  exercises,
  alreadyAdded,
  addAction,
  hiddenFields,
  onClose,
}: {
  exercises: ExerciseItem[];
  alreadyAdded: Set<string>;
  addAction: AddAction;
  // Campos que identifican el destino, p. ej. { routineId } o { sessionId }.
  hiddenFields: Record<string, string>;
  onClose: () => void;
}) {
  const [view, setView] = useState<"pick" | "create">("pick");
  const [query, setQuery] = useState("");
  // Se guarda en orden de selección: así se agregan a la rutina.
  const [selected, setSelected] = useState<string[]>([]);

  const select = (id: string) => setSelected((prev) => (prev.includes(id) ? prev : [...prev, id]));
  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <Modal title={view === "pick" ? "Agregar ejercicios" : "Nuevo ejercicio"} onClose={onClose}>
      {view === "pick" ? (
        <PickView
          addAction={addAction}
          hiddenFields={hiddenFields}
          exercises={exercises}
          alreadyAdded={alreadyAdded}
          query={query}
          onQueryChange={setQuery}
          selected={selected}
          onToggle={toggle}
          onCreateNew={() => setView("create")}
          onClose={onClose}
        />
      ) : (
        <CreateView
          initialName={query.trim()}
          onCreated={(id) => {
            select(id);
            setQuery("");
            setView("pick");
          }}
          onCancel={() => setView("pick")}
        />
      )}
    </Modal>
  );
}

function PickView({
  addAction,
  hiddenFields,
  exercises,
  alreadyAdded,
  query,
  onQueryChange,
  selected,
  onToggle,
  onCreateNew,
  onClose,
}: {
  addAction: AddAction;
  hiddenFields: Record<string, string>;
  exercises: ExerciseItem[];
  alreadyAdded: Set<string>;
  query: string;
  onQueryChange: (query: string) => void;
  selected: string[];
  onToggle: (id: string) => void;
  onCreateNew: () => void;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(
    async (prev: AddState, formData: FormData) => {
      const result = await addAction(prev, formData);
      if (result?.ok) onClose();
      return result;
    },
    undefined,
  );

  const q = normalize(query.trim());
  const visible = q ? exercises.filter((e) => normalize(e.name).includes(q)) : exercises;

  return (
    <form action={action} className="space-y-3">
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {selected.map((id) => (
        <input key={id} type="hidden" name="exerciseIds" value={id} />
      ))}

      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-fog" />
        <label htmlFor="picker-search" className="sr-only">
          Buscar ejercicio
        </label>
        <input
          id="picker-search"
          type="search"
          className="field py-2! pl-9!"
          placeholder="Buscar…"
          autoComplete="off"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </div>

      <ul className="-mx-1 max-h-[42dvh] divide-y divide-stone-edge/70 overflow-y-auto px-1">
        {visible.length === 0 && (
          <li className="py-4 text-center text-sm text-fog">Ningún ejercicio coincide con «{query}».</li>
        )}
        {visible.map((exercise) => {
          const added = alreadyAdded.has(exercise.id);
          const checked = added || selected.includes(exercise.id);
          return (
            <li key={exercise.id}>
              {/* relative: ancla el checkbox sr-only (absolute) a su fila. Sin esto queda
                  posicionado respecto del <dialog>, alarga su scroll y lo desplaza al marcar. */}
              <label
                className={`relative flex items-center gap-3 py-3 pl-1 ${added ? "cursor-default text-fog" : "cursor-pointer text-bone"}`}
              >
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={checked}
                  disabled={added}
                  onChange={() => onToggle(exercise.id)}
                />
                <span
                  aria-hidden
                  className={`flex h-5 w-5 shrink-0 rotate-45 items-center justify-center border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ember ${
                    checked ? "border-ember bg-ember text-abyss" : "border-stone-edge bg-ash"
                  } ${added ? "opacity-50" : ""}`}
                >
                  {checked && <CheckIcon className="h-3.5 w-3.5 -rotate-45" strokeWidth={2.5} />}
                </span>
                <span className="min-w-0 flex-1 truncate">{exercise.name}</span>
                {added && <span className="text-xs text-fog">Agregado</span>}
              </label>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={onCreateNew}
        className="flex w-full items-center justify-center gap-2 border border-dashed border-stone-edge py-2.5 text-sm text-ember-bright transition-colors hover:border-ember"
      >
        <PlusIcon className="h-4 w-4" />
        {query.trim() ? <>Crear «{query.trim()}»</> : "Crear ejercicio nuevo"}
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
        <button
          type="submit"
          className="btn-ember px-2! tracking-[0.12em]! whitespace-nowrap"
          disabled={pending || selected.length === 0}
        >
          {pending ? "Agregando…" : selected.length > 0 ? `Aceptar (${selected.length})` : "Aceptar"}
        </button>
      </div>
    </form>
  );
}

function CreateView({
  initialName,
  onCreated,
  onCancel,
}: {
  initialName: string;
  onCreated: (exerciseId: string) => void;
  onCancel: () => void;
}) {
  const [state, action, pending] = useActionState(
    async (prev: ExerciseFormState, formData: FormData) => {
      const result = await createExercise(prev, formData);
      if (result?.exercise) onCreated(result.exercise.id);
      return result;
    },
    undefined,
  );

  async function restore(formData: FormData) {
    await restoreExercise(formData);
    onCreated(String(formData.get("id")));
  }

  return (
    <>
      <form action={action} className="space-y-4">
        <p className="text-sm text-fog">
          Se guardará en tu lista de ejercicios y quedará seleccionado para esta rutina.
        </p>
        <div className="space-y-1.5">
          <label
            htmlFor="new-exercise-name"
            className="block font-display text-xs tracking-[0.15em] text-fog uppercase"
          >
            Nombre
          </label>
          <input
            id="new-exercise-name"
            name="name"
            className="field"
            placeholder="Ej. Hip Thrust"
            autoComplete="off"
            maxLength={60}
            autoFocus
            defaultValue={state?.name ?? initialName}
            aria-invalid={Boolean(state?.error)}
            aria-describedby={state?.error ? "new-exercise-name-error" : undefined}
          />
          {state?.error && (
            <p id="new-exercise-name-error" role="alert" className="text-sm text-blood">
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

      {state?.archivedMatch && (
        <form action={restore} className="mt-4 border-t border-stone-edge pt-4 text-sm text-fog">
          <input type="hidden" name="id" value={state.archivedMatch.id} />
          <p>
            Ya tienes «<span className="text-bone">{state.archivedMatch.name}</span>» archivado.
          </p>
          <button type="submit" className="mt-1 py-2 text-ember-bright hover:underline">
            Restaurarlo y seleccionarlo
          </button>
        </form>
      )}
    </>
  );
}
