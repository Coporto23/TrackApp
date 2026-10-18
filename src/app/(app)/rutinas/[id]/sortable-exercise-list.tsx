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
import { useState, useTransition } from "react";
import { removeRoutineExercise, reorderRoutineExercises } from "@/actions/routines";
import { IconButton } from "@/components/icon-button";
import { CloseIcon, GripIcon } from "@/components/icons";
import type { RoutineExerciseItem } from "@/lib/data/routines";

export function SortableExerciseList({
  routineId,
  items: initialItems,
}: {
  routineId: string;
  items: RoutineExerciseItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState<string>();
  const [, startTransition] = useTransition();
  const sensors = useSensors(
    // La manija tiene touch-action: none, así que el arrastre no choca con el scroll.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const previous = items;
    const next = arrayMove(
      items,
      items.findIndex((i) => i.id === active.id),
      items.findIndex((i) => i.id === over.id),
    );
    setItems(next); // optimista: se ve al instante
    setError(undefined);
    startTransition(async () => {
      const result = await reorderRoutineExercises(routineId, next.map((i) => i.id));
      if (result?.error) {
        setItems(previous);
        setError("No se pudo guardar el nuevo orden. Inténtalo de nuevo.");
      }
    });
  }

  return (
    <>
      <DndContext
        id={`routine-${routineId}`}
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
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <ol className="divide-y divide-stone-edge/70">
            {items.map((item, index) => (
              <SortableRow key={item.id} item={item} position={index + 1} />
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

function SortableRow({ item, position }: { item: RoutineExerciseItem; position: number }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative flex items-center gap-1 bg-stone py-1 ${
        isDragging ? "z-10 shadow-[0_0_0_1px_var(--color-ember),0_8px_24px_rgba(0,0,0,0.6)]" : ""
      }`}
    >
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
      <span className="min-w-0 flex-1 truncate py-2 text-bone">{item.name}</span>
      <form action={removeRoutineExercise}>
        <input type="hidden" name="id" value={item.id} />
        <IconButton label={`Quitar ${item.name} de la rutina`} tone="danger">
          <CloseIcon className="h-5 w-5" />
        </IconButton>
      </form>
    </li>
  );
}
