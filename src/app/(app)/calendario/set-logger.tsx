"use client";

import { useActionState, useState, type ReactNode } from "react";
import { addSet, deleteSet, updateSet, type SetFormState } from "@/actions/sets";
import { IconButton } from "@/components/icon-button";
import { CheckIcon, CloseIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { WEIGHT_UNIT_LABELS, WEIGHT_UNITS, type WeightUnitValue } from "@/lib/constants";
import { formatShortDate } from "@/lib/dates";
import type { DayExercise, LoggedSet } from "@/lib/data/sessions";

// "82.5" → "82,5" (coma decimal, como se escribe en Chile). Los niveles van tal cual.
const displayLoad = (load: string, unit: WeightUnitValue) =>
  unit === "level" ? load : load.replace(".", ",").replace(/,00?$/, "");
export const formatSetLoad = (load: string, unit: WeightUnitValue) =>
  unit === "level" ? `nivel ${load}` : `${displayLoad(load, unit)} ${WEIGHT_UNIT_LABELS[unit]}`;

// Filtros mientras se escribe (el servidor valida igual con Zod):
// reps solo dígitos; peso solo números con un separador decimal; nivel texto corto.
const onlyDigits = (value: string) => value.replace(/\D/g, "").slice(0, 3);
function onlyWeight(value: string) {
  const [int = "", ...rest] = value.replace(/[^\d.,]/g, "").split(/[.,]/);
  const hasSeparator = /[.,]/.test(value);
  const separator = value.match(/[.,]/)?.[0] ?? ",";
  return hasSeparator ? `${int.slice(0, 4)}${separator}${rest.join("").slice(0, 2)}` : int.slice(0, 4);
}
const onlyLevel = (value: string) => value.replace(/[^\p{L}\p{N} .+-]/gu, "").slice(0, 10);

function formatPrevious(sets: Omit<LoggedSet, "id">[]) {
  const unit = sets[0].unit;
  const sameUnit = sets.every((s) => s.unit === unit);
  if (sameUnit && unit !== "level") {
    return `${sets.map((s) => `${displayLoad(s.load, unit)}×${s.reps}`).join(" · ")} ${WEIGHT_UNIT_LABELS[unit]}`;
  }
  return sets.map((s) => `${formatSetLoad(s.load, s.unit)} × ${s.reps}`).join(" · ");
}

// Detalle desplegable de un ejercicio del día: sus series y el formulario para la
// siguiente. Tras cada serie el formulario queda vacío; solo se recuerda la unidad.
export function SetLogger({ sessionId, exercise }: { sessionId: string; exercise: DayExercise }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const lastUnit = (exercise.sets.at(-1) ?? exercise.previous?.sets[0])?.unit;

  return (
    <div className="space-y-2 border-l border-stone-edge pl-3">
      {exercise.previous && (
        <p className="text-xs text-fog">
          <span className="text-gold">Última vez ({formatShortDate(exercise.previous.date)}):</span>{" "}
          {formatPrevious(exercise.previous.sets)}
        </p>
      )}

      {exercise.sets.length > 0 && (
        <ol className="space-y-1" aria-label={`Series de ${exercise.name}`}>
          {exercise.sets.map((set) =>
            editingId === set.id ? (
              <li key={set.id}>
                <EditSetForm set={set} onDone={() => setEditingId(null)} />
              </li>
            ) : (
              <li key={set.id}>
                <button
                  type="button"
                  onClick={() => setEditingId(set.id)}
                  aria-label={`Editar serie ${set.setNumber}: ${set.reps} repeticiones con ${formatSetLoad(set.load, set.unit)}`}
                  className="flex w-full items-center gap-3 bg-abyss/40 px-2 py-2 text-left text-sm transition-colors hover:bg-abyss/70"
                >
                  <span className="w-5 font-display text-gold">{set.setNumber}</span>
                  <span className="flex-1 text-bone">
                    {set.reps} reps <span className="text-fog">×</span> {formatSetLoad(set.load, set.unit)}
                  </span>
                </button>
              </li>
            ),
          )}
        </ol>
      )}

      <NewSetForm
        // Remontar tras cada serie: el formulario vuelve a quedar vacío.
        key={exercise.sets.length}
        sessionId={sessionId}
        exerciseId={exercise.exerciseId}
        nextNumber={exercise.sets.length + 1}
        defaults={lastUnit && { unit: lastUnit }}
      />
    </div>
  );
}

function NewSetForm({
  sessionId,
  exerciseId,
  nextNumber,
  defaults,
}: {
  sessionId: string;
  exerciseId: string;
  nextNumber: number;
  defaults?: Partial<Omit<LoggedSet, "id">>;
}) {
  const [state, action, pending] = useActionState(addSet, undefined);

  return (
    <form action={action} className="space-y-1.5">
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="exerciseId" value={exerciseId} />
      <p className="font-display text-[11px] tracking-[0.12em] text-fog uppercase">Serie {nextNumber}</p>
      <SetFields idPrefix={`new-${exerciseId}`} defaults={defaults} state={state}>
        <button
          type="submit"
          disabled={pending}
          aria-label="Agregar serie"
          title="Agregar serie"
          className="btn-ember h-10 w-10! shrink-0 p-0!"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </SetFields>
    </form>
  );
}

function EditSetForm({ set, onDone }: { set: LoggedSet; onDone: () => void }) {
  const [state, action] = useActionState(async (prev: SetFormState, formData: FormData) => {
    const result = await updateSet(prev, formData);
    if (result?.ok) onDone();
    return result;
  }, undefined);

  async function remove(formData: FormData) {
    await deleteSet(formData);
    onDone();
  }

  return (
    <div className="space-y-1.5 border border-ember-deep bg-abyss/40 p-2">
      <div className="flex items-center justify-between">
        <p className="font-display text-[11px] tracking-[0.12em] text-ember-bright uppercase">
          Editar serie {set.setNumber}
        </p>
        <form action={remove}>
          <input type="hidden" name="id" value={set.id} />
          <IconButton label={`Eliminar serie ${set.setNumber}`} tone="danger" className="h-8! w-8!">
            <TrashIcon className="h-4 w-4" />
          </IconButton>
        </form>
      </div>
      <form action={action}>
        <input type="hidden" name="id" value={set.id} />
        <SetFields idPrefix={`edit-${set.id}`} defaults={set} state={state}>
          <IconButton label="Guardar serie" tone="ember" className="h-10! w-9!">
            <CheckIcon className="h-5 w-5" />
          </IconButton>
          <IconButton label="Cancelar edición" type="button" onClick={onDone} className="h-10! w-9!">
            <CloseIcon className="h-5 w-5" />
          </IconButton>
        </SetFields>
      </form>
    </div>
  );
}

// Campos de una serie: repeticiones, carga y unidad. La carga es peso numérico
// (kg/lbs) o, con "nivel", un número o texto corto ("5", "B", "A2").
function SetFields({
  idPrefix,
  defaults,
  state,
  children,
}: {
  idPrefix: string;
  defaults?: Partial<Omit<LoggedSet, "id">>;
  state: SetFormState;
  children: ReactNode;
}) {
  const errors = state?.fieldErrors;
  const message = state?.error ?? errors?.reps?.[0] ?? errors?.load?.[0] ?? errors?.unit?.[0];
  const [unit, setUnit] = useState<WeightUnitValue>(defaults?.unit ?? "kg");
  const [reps, setReps] = useState(defaults?.reps?.toString() ?? "");
  const [load, setLoad] = useState(defaults?.load ? displayLoad(defaults.load, defaults.unit ?? "kg") : "");
  const isLevel = unit === "level";

  function changeUnit(next: WeightUnitValue) {
    setUnit(next);
    // Al volver a kg/lbs, descartar lo que no sea numérico (p. ej. un nivel "B").
    if (next !== "level") setLoad((current) => onlyWeight(current));
  }

  // Anchos fijos y compactos: la fila completa cabe en ~230px (tarjeta desplegada
  // dentro de la semana en un celular). Unidad en <select> nativo: ocupa poco y
  // en móvil abre la lista del sistema.
  return (
    <>
      <div className="flex items-end gap-1.5">
        <label className="w-12 shrink-0">
          <span className="mb-0.5 block text-[10px] text-fog uppercase">Reps</span>
          <input
            id={`${idPrefix}-reps`}
            name="reps"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            maxLength={3}
            className="field h-10 px-1! py-0! text-center"
            value={reps}
            onChange={(e) => setReps(onlyDigits(e.target.value))}
            aria-invalid={Boolean(errors?.reps)}
          />
        </label>
        <label className="w-16 shrink-0">
          <span className="mb-0.5 block text-[10px] text-fog uppercase">{isLevel ? "Nivel" : "Peso"}</span>
          <input
            id={`${idPrefix}-load`}
            name="load"
            inputMode={isLevel ? "text" : "decimal"}
            autoCapitalize={isLevel ? "characters" : "off"}
            autoComplete="off"
            maxLength={isLevel ? 10 : 7}
            className="field h-10 px-1! py-0! text-center"
            value={load}
            onChange={(e) => setLoad(isLevel ? onlyLevel(e.target.value) : onlyWeight(e.target.value))}
            aria-invalid={Boolean(errors?.load)}
          />
        </label>
        <label className="min-w-0 flex-1">
          <span className="mb-0.5 block text-[10px] text-fog uppercase">Unidad</span>
          <select
            id={`${idPrefix}-unit`}
            name="unit"
            value={unit}
            onChange={(e) => changeUnit(e.target.value as WeightUnitValue)}
            className="field h-10 px-1! py-0! text-center"
          >
            {WEIGHT_UNITS.map((u) => (
              <option key={u} value={u}>
                {WEIGHT_UNIT_LABELS[u]}
              </option>
            ))}
          </select>
        </label>
        {children}
      </div>
      {message && (
        <p role="alert" className="text-xs text-blood">
          {message}
        </p>
      )}
    </>
  );
}
