"use client";

import { useSyncExternalStore } from "react";
import { localToday } from "./dates";

// "Hoy" solo se conoce en el navegador; en el servidor es null (sin resaltar).
const noopSubscribe = () => () => {};
export const useToday = () => useSyncExternalStore(noopSubscribe, localToday, () => null);

// Preferencia del navegador (p. ej. rango y unidad del dashboard) guardada en
// localStorage. Si el almacenamiento falla (modo privado, bloqueado), la elección
// vale solo mientras la página está abierta.
const STORAGE_EVENT = "trackapp-storage";
const memory = new Map<string, string>();
function readStored(key: string): string | null {
  let value = memory.get(key) ?? null;
  try {
    value = window.localStorage.getItem(key) ?? value;
  } catch {}
  return value;
}
function subscribeStorage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(STORAGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(STORAGE_EVENT, onChange);
  };
}
// Texto guardado tal cual (null si no hay); quien lo usa lo valida.
export function useStoredValue(key: string) {
  const value = useSyncExternalStore(subscribeStorage, () => readStored(key), () => null);
  const set = (next: string) => {
    memory.set(key, next);
    try {
      window.localStorage.setItem(key, next);
    } catch {}
    window.dispatchEvent(new Event(STORAGE_EVENT));
  };
  return [value, set] as const;
}

// Una de varias opciones fijas guardada en el navegador.
export function useStoredChoice<T extends string>(key: string, allowed: readonly T[], fallback: T) {
  const [value, set] = useStoredValue(key);
  return [allowed.includes(value as T) ? (value as T) : fallback, set as (next: T) => void] as const;
}
