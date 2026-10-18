"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, useTransition, type ReactNode } from "react";
import { IconButton } from "./icon-button";
import { ChevronRightIcon, CloseIcon, GripIcon } from "./icons";

export type SortableExerciseItem = { id: string; name: string; note?: string };

type RowOptions<T> = {
  removeAction: (formData: FormData) => Promise<void>;
  removeLabel: (name: string) => string;
  // Si devuelve un texto, el botón de quitar se deshabilita mostrando el motivo.
  removeBlockedReason?: (item: T) => string | undefined;
  // Con esto, tocar el nombre despliega un detalle bajo la fila (uno a la vez).
  renderDetail?: (item: T) => ReactNode;
};

// Lista de ejercicios ordenable (rutinas y sesiones). `id` es el id de la fila
// de vínculo (RoutineExercise / SessionExercise), no el del ejercicio.
export function SortableExerciseList<T extends SortableExerciseItem>({
  dndId,
  items,
  onReorder,
  ...rowOptions
}: {
  dndId: string;
  items: T[];
  onReorder: (orderedIds: string[]) => Promise<{ error?: string } | undefined>;
} & RowOptions<T>) {
  // Solo el ORDEN es estado local (optimista al arrastrar); los datos de cada fila
  // salen siempre de `items`, así se actualizan tras cada refresh sin remontar.
  // Si cambia el conjunto de filas, el padre remonta la lista con otra `key`.
  const [order, setOrder] = useState(() => items.map((i) => i.id));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [, startTransition] = useTransition();
  const byId = new Map(items.map((i) => [i.id, i]));
  const ordered = order.map((id) => byId.get(id)).filter((i): i is T => Boolean(i));
  const sensors = useSensors(
    // La manija tiene touch-action: none, así que el arrastre no choca con el scroll.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const previous = order;
    const next = arrayMove(order, order.indexOf(String(active.id)), order.indexOf(String(over.id)));
    setOrder(next); // optimista: se ve al instante
    setError(undefined);
    startTransition(async () => {
      const result = await onReorder(next);
      if (result?.error) {
        setOrder(previous);
        setError("No se pudo guardar el nuevo orden. Inténtalo de nuevo.");
      }
    });
  }

  return (
    <>
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragEnd={handleDragEnd}
        accessibility={{
          screenReaderInstructions: {
            draggable: "Pulsa espacio para tomar el ejercicio, flechas para moverlo y espacio para soltarlo.",
          },
        }}
      >
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          <ol className="divide-y divide-stone-edge/70">
            {ordered.map((item, index) => (
              <SortableRow
                key={item.id}
                item={item}
                position={index + 1}
                expanded={expandedId === item.id}
                onToggle={() => setExpandedId((current) => (current === item.id ? null : item.id))}
                {...rowOptions}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      {error && (
        <p role="alert" className="mt-2 text-sm text-blood">
          {error}
        </p>
      )}
    </>
  );
}

function SortableRow<T extends SortableExerciseItem>({
  item,
  position,
  expanded,
  onToggle,
  removeAction,
  removeLabel,
  removeBlockedReason,
  renderDetail,
}: {
  item: T;
  position: number;
  expanded: boolean;
  onToggle: () => void;
} & RowOptions<T>) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const blockedReason = removeBlockedReason?.(item);
  const detailId = `detail-${item.id}`;

  const nameBlock = (
    <>
      <span className="block truncate text-bone">{item.name}</span>
      {item.note && <span className="block text-xs text-fog">{item.note}</span>}
    </>
  );

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative bg-stone ${
        isDragging ? "z-10 shadow-[0_0_0_1px_var(--color-ember),0_8px_24px_rgba(0,0,0,0.6)]" : ""
      }`}
    >
      <div className="flex items-center gap-1 py-1">
        <button
          type="button"
          ref={setActivatorNodeRef}
          aria-label={`Mover ${item.name}`}
          className="flex h-11 w-9 shrink-0 cursor-grab touch-none items-center justify-center text-fog outline-none hover:text-ember-bright focus-visible:text-ember-bright focus-visible:ring-1 focus-visible:ring-ember active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripIcon className="h-5 w-5" />
        </button>
        <span className="w-6 shrink-0 text-center font-display text-sm text-gold">{position}</span>
        {renderDetail ? (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-controls={detailId}
            className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left"
          >
            <span className="min-w-0 flex-1">{nameBlock}</span>
            <ChevronRightIcon
              className={`h-4 w-4 shrink-0 text-fog transition-transform ${expanded ? "rotate-90 text-ember-bright" : ""}`}
            />
          </button>
        ) : (
          <span className="min-w-0 flex-1 py-2">{nameBlock}</span>
        )}
        <form action={removeAction}>
          <input type="hidden" name="id" value={item.id} />
          <IconButton
            label={blockedReason ?? removeLabel(item.name)}
            tone="danger"
            disabled={Boolean(blockedReason)}
          >
            <CloseIcon className="h-5 w-5" />
          </IconButton>
        </form>
      </div>
      {renderDetail && expanded && (
        <div id={detailId} className="pb-3 pl-3">
          {renderDetail(item)}
        </div>
      )}
    </li>
  );
}
