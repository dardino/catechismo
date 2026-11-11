"use server";

import { eq, asc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import { hashPassword, validatePasswordComplexity } from "@/lib/auth/password";
import { revalidatePath } from "next/cache";

export type UserActionState = { error?: string; ok?: boolean };

export async function listUsersAction() {
  await requireAdmin();
  const db = await getDb();
  return db
    .select({ id: users.id, username: users.username, role: users.role, mustChangePassword: users.mustChangePassword, createdAt: users.createdAt })
    .from(users)
    .orderBy(asc(users.username));
}

export async function createUserAction(_prev: UserActionState, formData: FormData): Promise<UserActionState> {
  await requireAdmin();
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "standard") as "admin" | "standard" | "viewer";
  if (!username) return { error: "Username obbligatorio." };
  if (!["admin", "standard", "viewer"].includes(role)) return { error: "Ruolo non valido." };
  const complexity = validatePasswordComplexity(password);
  if (complexity) return { error: complexity };

  const db = await getDb();
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
  if (existing[0]) return { error: "Username già esistente." };

  await db.insert(users).values({
    username,
    passwordHash: hashPassword(password),
    role,
    mustChangePassword: true,
  });
  revalidatePath("/configurazione");
  return { ok: true };
}

export async function updateUserRoleAction(_prev: UserActionState, formData: FormData): Promise<UserActionState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") || "");
  const role = String(formData.get("role") || "standard") as "admin" | "standard" | "viewer";
  if (!id) return { error: "Utente non valido." };
  if (!["admin", "standard", "viewer"].includes(role)) return { error: "Ruolo non valido." };
  if (id === admin.id && role !== "admin") return { error: "Non puoi rimuovere il ruolo admin al tuo utente." };

  const db = await getDb();
  const row = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!row[0]) return { error: "Utente non trovato." };
  // Prevent demoting the default Admin account from admin
  if (row[0].username === "Admin" && role !== "admin") return { error: "L'utente Admin deve rimanere amministratore." };

  await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, id));
  revalidatePath("/configurazione");
  return { ok: true };
}

export async function resetUserPasswordAction(_prev: UserActionState, formData: FormData): Promise<UserActionState> {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const password = String(formData.get("password") || "");
  if (!id) return { error: "Utente non valido." };
  const complexity = validatePasswordComplexity(password);
  if (complexity) return { error: complexity };
  const db = await getDb();
  await db.update(users).set({ passwordHash: hashPassword(password), mustChangePassword: true, updatedAt: new Date() }).where(eq(users.id, id));
  revalidatePath("/configurazione");
  return { ok: true };
}

export async function deleteUserAction(id: string): Promise<UserActionState> {
  const admin = await requireAdmin();
  const db = await getDb();
  const row = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!row[0]) return { error: "Utente non trovato." };
  if (row[0].username === "Admin") return { error: "L'utente Admin predefinito non può essere eliminato." };
  if (id === admin.id) return { error: "Non puoi eliminare il tuo utente corrente." };
  await db.delete(users).where(eq(users.id, id));
  revalidatePath("/configurazione");
  return { ok: true };
}
