import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEYLEN).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [algo, salt, hashHex] = String(stored).split(":");
    if (algo !== "scrypt" || !salt || !hashHex) return false;
    const hash = Buffer.from(hashHex, "hex");
    const derived = scryptSync(password, salt, hash.length);
    if (hash.length !== derived.length) return false;
    return timingSafeEqual(hash, derived);
  } catch {
    return false;
  }
}

export function validatePasswordComplexity(password: string): string | null {
  if (password.length < 8) return "La password deve contenere almeno 8 caratteri.";
  if (!/[a-z]/.test(password)) return "La password deve contenere almeno una lettera minuscola.";
  if (!/[A-Z]/.test(password)) return "La password deve contenere almeno una lettera maiuscola.";
  if (!/[0-9]/.test(password)) return "La password deve contenere almeno un numero.";
  if (!/[^A-Za-z0-9]/.test(password)) return "La password deve contenere almeno un carattere speciale.";
  return null;
}

