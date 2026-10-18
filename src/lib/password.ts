import "server-only";
import { hash, verify } from "@node-rs/argon2";

// Argon2id (por defecto en @node-rs/argon2) con los parámetros mínimos de OWASP.
const ARGON2_OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

export function hashPassword(password: string) {
  return hash(password, ARGON2_OPTIONS);
}

export function verifyPassword(passwordHash: string, password: string) {
  return verify(passwordHash, password);
}
