"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { clearSessionCookie, setSessionCookie, requireUser } from "@/lib/auth/session";
import { hashPassword, validatePasswordComplexity, verifyPassword } from "@/lib/auth/password";

export async function ensureDefaultAdmin() {
  const db = await getDb();
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.username, "Admin")).limit(1);
  if (existing[0]) return;
  await db.insert(users).values({
    username: "Admin",
    passwordHash: hashPassword("admin"),
    role: "admin",
    mustChangePassword: true,
  });
}

export async function loginAction(_prevState: { error?: string } | undefined, formData: FormData) {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/iscritti");
  if (!process.env.SESSION_SECRET) {
    return { error: "Configurazione auth mancante (SESSION_SECRET)" };
  }
  if (!username || !password) return { error: "Inserisci username e password." };

  try {
    await ensureDefaultAdmin();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: `Database non pronto: ${msg}` };
  }

  const db = await getDb();
  const rows = await db.select().from(users).where(eq(users.username, username)).limit(1);
  const user = rows[0];
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "Credenziali non valide" };
  }

  await setSessionCookie({
    id: user.id,
    username: user.username,
    role: user.role as "admin" | "standard" | "viewer",
    mustChangePassword: user.mustChangePassword,
  });

  if (user.mustChangePassword) {
    redirect("/cambia-password");
  }
  redirect(next.startsWith("/") && !next.startsWith("/login") ? next : "/iscritti");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}

export async function changePasswordAction(_prevState: { error?: string; ok?: boolean } | undefined, formData: FormData) {
  const currentUser = await requireUser();
  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (newPassword !== confirmPassword) return { error: "Le nuove password non coincidono." };
  const complexity = validatePasswordComplexity(newPassword);
  if (complexity) return { error: complexity };

  const db = await getDb();
  const rows = await db.select().from(users).where(eq(users.id, currentUser.id)).limit(1);
  const user = rows[0];
  if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
    return { error: "Password attuale non valida." };
  }
  if (currentPassword === newPassword) {
    return { error: "La nuova password deve essere diversa da quella attuale." };
  }

  await db
    .update(users)
    .set({ passwordHash: hashPassword(newPassword), mustChangePassword: false, updatedAt: new Date() })
    .where(eq(users.id, currentUser.id));

  await setSessionCookie({
    id: user.id,
    username: user.username,
    role: user.role as "admin" | "standard" | "viewer",
    mustChangePassword: false,
  });

  redirect("/iscritti");
}

