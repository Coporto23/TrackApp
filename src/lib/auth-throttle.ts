import "server-only";
import { createLimiter } from "./rate-limit";

const MINUTE = 60_000;

// Login: 5 fallos por email o 20 por IP en 15 min → 15 min de bloqueo.
const loginByEmail = createLimiter("login-email", { limit: 5, windowMs: 15 * MINUTE, blockMs: 15 * MINUTE });
const loginByIp = createLimiter("login-ip", { limit: 20, windowMs: 15 * MINUTE, blockMs: 15 * MINUTE });
// Registro: 5 cuentas por IP por hora.
const registerByIp = createLimiter("register-ip", { limit: 5, windowMs: 60 * MINUTE, blockMs: 60 * MINUTE });

/**
 * IP del cliente. En QA/Producción Traefik fija `X-Real-Ip` con la dirección real
 * (no confía en cabeceras enviadas por el cliente); sin proxy, cae en "local".
 */
export function clientIp(headers: Headers): string {
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const forwarded = headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  return forwarded || "local";
}

export function loginRetryAfter(email: string, ip: string): number {
  return Math.max(loginByEmail.retryAfter(email), loginByIp.retryAfter(ip));
}

export function recordLoginFailure(email: string, ip: string) {
  loginByEmail.hit(email);
  loginByIp.hit(ip);
}

export function clearLoginFailures(email: string) {
  loginByEmail.reset(email);
}

export function registerRetryAfter(ip: string): number {
  return registerByIp.retryAfter(ip);
}

export function recordRegistration(ip: string) {
  registerByIp.hit(ip);
}

export function tooManyAttemptsMessage(retryAfterMs: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterMs / MINUTE));
  return `Demasiados intentos. Prueba de nuevo en ${minutes} ${minutes === 1 ? "minuto" : "minutos"}.`;
}
