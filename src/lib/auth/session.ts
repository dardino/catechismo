import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE_NAME = "catechismo_session";
export type UserRole = "admin" | "standard" | "viewer";
export type SessionUser = { id: string; username: string; role: UserRole; mustChangePassword: boolean };

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET non configurato");
  return secret;
}

function b64urlEncode(s: string) {
  return Buffer.from(s, "utf8").toString("base64url");
}
function b64urlDecode(s: string) {
  return Buffer.from(s, "base64url").toString("utf8");
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

export function createSessionToken(user: SessionUser) {
  const payload = b64urlEncode(
    JSON.stringify({ sub: user.id, u: user.username, r: user.role, mcp: user.mustChangePassword ? 1 : 0, t: Date.now() }),
  );
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined | null): SessionUser | null {
  if (!token) return null;
  const idx = token.lastIndexOf(".");
  if (idx <= 0) return null;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  try {
    const expected = sign(payload);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const data = JSON.parse(b64urlDecode(payload)) as { sub?: string; u?: string; r?: string; mcp?: number | boolean };
    if (!data?.sub || !data?.u || !data?.r) return null;
    if (data.r !== "admin" && data.r !== "standard" && data.r !== "viewer") return null;
    return { id: data.sub, username: data.u, role: data.r, mustChangePassword: !!data.mcp };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

export async function isAuthenticated() {
  return (await getCurrentUser()) != null;
}

export async function setSessionCookie(user: SessionUser) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createSessionToken(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Non autorizzato");
  return user;
}

export async function requireAuth(): Promise<SessionUser> {
  return requireUser();
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") throw new Error("Accesso riservato agli amministratori");
  return user;
}

export async function requireWrite(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role === "viewer") throw new Error("Utente in sola lettura: operazione non consentita");
  return user;
}
