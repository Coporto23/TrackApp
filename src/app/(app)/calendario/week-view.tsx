"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useSyncExternalStore } from "react";
import { BackIcon, ChevronRightIcon, PlusIcon } from "@/components/icons";
import {
  addDays,
  dayOfMonth,
  formatLongDate,
  formatWeekRange,
  localToday,
} from "@/lib/dates";
import type { ExerciseItem } from "@/lib/data/exercises";
import type { RoutineSummary } from "@/lib/data/routines";
import type { DaySession, WeekSession } from "@/lib/data/sessions";
import { AssignRoutineDialog } from "./assign-routine-dialog";
import { exercisesLabel, seriesLabel, SessionDetails } from "./session-details";

const SWIPE_THRESHOLD = 50;
const dayHref = (date: string) => `/calendario?d=${date}`;
const weekdayShort = new Intl.DateTimeFormat("es-CL", { weekday: "short", timeZone: "UTC" });
const shortDay = (iso: string) => weekdayShort.format(new Date(`${iso}T00:00:00Z`)).replace(".", "");

// "Hoy" solo se conoce en el navegador; en el servidor es null (sin resaltar).
const noopSubscribe = () => () => {};
const useToday = () => useSyncExternalStore(noopSubscribe, localToday, () => null);

// Semana en vertical (lunes a domingo). Cada día muestra su entrenamiento como
// una tarjeta (estilo agenda); la del día seleccionado se despliega con el detalle.
export function WeekView({
  selected,
  days,
  weekSessions,
  selectedSession,
  routines,
  exercises,
}: {
  selected: string;
  days: string[];
  weekSessions: WeekSession[];
  selectedSession: DaySession | null;
  routines: RoutineSummary[];
  exercises: ExerciseItem[];
}) {
  const router = useRouter();
  const today = useToday();
  const [assignDate, setAssignDate] = useState<string | null>(null);
  const swipeStart = useRef<number | null>(null);
  const byDate = new Map(weekSessions.map((s) => [s.date, s]));
  const prevWeek = dayHref(addDays(selected, -7));
  const nextWeek = dayHref(addDays(selected, 7));

  return (
    <section
      aria-label="Semana"
      // Deslizar horizontalmente cambia de semana; el scroll vertical sigue libre.
      style={{ touchAction: "pan-y" }}
      // Sin esto, arrastrar con mouse sobre un enlace inicia su "drag" nativo,
      // que cancela el puntero (pointercancel) y el gesto nunca termina.
      onDragStart={(e) => e.preventDefault()}
      onPointerCancel={() => (swipeStart.current = null)}
      onPointerDown={(e) => {
        // No cuenta como gesto si empieza en la manija de reordenar (dnd-kit le pone
        // aria-roledescription), un campo o un modal. Sobre botones y tarjetas sí:
        // al deslizar, el toque no llega a ser "click".
        const target = e.target as HTMLElement;
        const excluded = target.closest("[aria-roledescription=sortable], input, dialog");
        swipeStart.current = excluded ? null : e.clientX;
      }}
      onPointerUp={(e) => {
        if (swipeStart.current === null) return;
        const dx = e.clientX - swipeStart.current;
        swipeStart.current = null;
        if (Math.abs(dx) >= SWIPE_THRESHOLD) router.push(dx > 0 ? prevWeek : nextWeek, { scroll: false });
      }}
    >
      <div className="facet mb-3 bg-stone-edge p-px">
        <div className="facet flex items-center justify-between bg-stone/95 px-1 py-1">
          <Link
            href={prevWeek}
            scroll={false}
            aria-label="Semana anterior"
            className="flex h-11 w-11 items-center justify-center text-fog hover:text-ember-bright"
          >
            <BackIcon className="h-5 w-5" />
          </Link>
          <div className="text-center">
            <p className="font-display text-sm tracking-[0.12em] text-bone uppercase">{formatWeekRange(days)}</p>
            {today && !days.includes(today) && (
              <Link
                href={dayHref(today)}
                scroll={false}
                className="font-display text-[11px] tracking-[0.15em] text-ember-bright uppercase hover:underline"
              >
                Ir a hoy
              </Link>
            )}
          </div>
          <Link
            href={nextWeek}
            scroll={false}
            aria-label="Semana siguiente"
            className="flex h-11 w-11 items-center justify-center text-fog hover:text-ember-bright"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </Link>
        </div>
      </div>

      <ol className="space-y-2">
        {days.map((day) => {
          const session = byDate.get(day);
          const isToday = day === today;
          const isSelected = day === selected;
          return (
            <li
              key={day}
              aria-label={`${formatLongDate(day)}${isToday ? ", hoy" : ""}${session ? `, ${session.title}` : ""}`}
              aria-current={isSelected ? "date" : undefined}
              className={`flex gap-3 border-b border-stone-edge/60 pb-2 ${isSelected ? "border-ember-deep" : ""}`}
            >
              <div
                className={`facet facet-sm flex w-12 shrink-0 flex-col items-center justify-center self-start py-1.5 ${
                  isToday ? "bg-ember text-abyss" : "text-bone"
                }`}
              >
                <span
                  className={`font-display text-[10px] tracking-[0.1em] uppercase ${isToday ? "text-abyss/80" : "text-fog"}`}
                >
                  {shortDay(day)}
                </span>
                <span className="font-display text-xl leading-tight font-bold">{dayOfMonth(day)}</span>
              </div>

              <div className="min-w-0 flex-1 py-0.5">
                {session && isSelected && selectedSession ? (
                  <SessionDetails session={selectedSession} exercises={exercises} />
                ) : session ? (
                  <Link
                    href={dayHref(day)}
                    scroll={false}
                    className="facet block border-l-2 border-ember bg-ash/90 px-3 py-2.5 transition-colors hover:bg-stone"
                  >
                    <span className={`block truncate font-display text-sm font-bold ${session.isFree ? "text-ember-bright" : "text-bone"}`}>
                      {session.title}
                    </span>
                    <span className="block text-xs text-fog">
                      {exercisesLabel(session.exerciseCount)} · {seriesLabel(session.setCount)}
                    </span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAssignDate(day)}
                    aria-label={`Asignar entrenamiento el ${formatLongDate(day)}`}
                    className="flex h-full min-h-12 w-full items-center gap-2 border border-dashed border-stone-edge/80 px-3 text-sm text-fog transition-colors hover:border-ember hover:text-ember-bright"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Asignar
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {assignDate && (
        <AssignRoutineDialog
          date={assignDate}
          routines={routines}
          onClose={() => setAssignDate(null)}
          // Al asignar, se despliega ese día para cargarle ejercicios.
          onAssigned={(date) => router.replace(dayHref(date), { scroll: false })}
        />
      )}
    </section>
  );
}
