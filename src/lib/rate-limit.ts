import "server-only";

// Limitador de intentos en memoria. Cada entorno corre una sola instancia de la
// app, así que basta; los contadores se reinician con cada despliegue o reinicio.
// Ventana fija: al llegar a `limit` intentos dentro de `windowMs`, la clave queda
// bloqueada durante `blockMs`.

type Entry = { count: number; windowStart: number; blockedUntil: number };

export type LimiterOptions = { limit: number; windowMs: number; blockMs: number };

export type Limiter = {
  /** Milisegundos de bloqueo restantes para la clave (0 si no está bloqueada). */
  retryAfter(key: string): number;
  /** Registra un intento; al alcanzar el límite, bloquea la clave. */
  hit(key: string): void;
  /** Olvida la clave (p. ej. tras un login correcto). */
  reset(key: string): void;
};

const MAX_KEYS = 10_000;

// En globalThis para sobrevivir a la recarga de módulos en `next dev`.
const stores = ((globalThis as { __trackappRateLimit?: Map<string, Map<string, Entry>> }).__trackappRateLimit ??=
  new Map());

export function createLimiter(name: string, { limit, windowMs, blockMs }: LimiterOptions, now = Date.now): Limiter {
  let store = stores.get(name);
  if (!store) {
    store = new Map();
    stores.set(name, store);
  }
  const entries = store;

  const isExpired = (entry: Entry, t: number) => entry.blockedUntil <= t && t - entry.windowStart >= windowMs;

  function prune(t: number) {
    if (entries.size < MAX_KEYS) return;
    for (const [key, entry] of entries) if (isExpired(entry, t)) entries.delete(key);
  }

  return {
    retryAfter(key) {
      const entry = entries.get(key);
      if (!entry) return 0;
      const t = now();
      if (isExpired(entry, t)) {
        entries.delete(key);
        return 0;
      }
      return Math.max(0, entry.blockedUntil - t);
    },
    hit(key) {
      const t = now();
      prune(t);
      let entry = entries.get(key);
      if (!entry || t - entry.windowStart >= windowMs) {
        entry = { count: 0, windowStart: t, blockedUntil: 0 };
        entries.set(key, entry);
      }
      entry.count += 1;
      if (entry.count >= limit) {
        entry.blockedUntil = t + blockMs;
        // La ventana siguiente empieza al terminar el bloqueo.
        entry.count = 0;
        entry.windowStart = entry.blockedUntil;
      }
    },
    reset(key) {
      entries.delete(key);
    },
  };
}
