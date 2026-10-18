"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRightIcon, PlusIcon } from "@/components/icons";
import type { RoutineSummary } from "@/lib/data/routines";
import { RoutineNameDialog } from "./routine-name-dialog";

export function RoutineList({ routines }: { routines: RoutineSummary[] }) {
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="font-display text-xs tracking-[0.15em] text-fog uppercase">
          Rutinas · {routines.length}
        </p>
        <button
          type="button"
          aria-label="Nueva rutina"
          title="Nueva rutina"
          onClick={() => setCreating(true)}
          className="btn-ember h-10 w-10! p-0!"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>

      {routines.length === 0 ? (
        <p className="py-6 text-center text-fog">Aún no tienes rutinas. Crea la primera con «+».</p>
      ) : (
        <ul className="divide-y divide-stone-edge/70">
          {routines.map((routine) => (
            <li key={routine.id}>
              <Link
                href={`/rutinas/${routine.id}`}
                className="flex items-center gap-3 py-3 text-bone transition-colors hover:text-ember-bright"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{routine.name}</span>
                  <span className="text-sm text-fog">
                    {routine.exerciseCount === 1 ? "1 ejercicio" : `${routine.exerciseCount} ejercicios`}
                  </span>
                </span>
                <ChevronRightIcon className="h-5 w-5 shrink-0 text-fog" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {creating && <RoutineNameDialog onClose={() => setCreating(false)} />}
    </div>
  );
}
