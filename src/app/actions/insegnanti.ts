"use server";

import { getDb } from "@/lib/db/client";
import { insegnanti } from "@/lib/db/schema";
import { requireUser, requireWrite } from "@/lib/auth/session";
import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type InsegnanteActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function parse(formData: FormData) {
  return { nome: String(formData.get("nome") || "").trim() };
}

function validate(input: { nome: string }) {
  if (!input.nome) return { fieldErrors: { nome: ["Campo obbligatorio"] } };
  return { data: input };
}

export async function listInsegnanti() {
  await requireUser();
  const db = await getDb();
  return db.select().from(insegnanti).orderBy(asc(insegnanti.nome));
}

export async function getInsegnante(id: string) {
  await requireUser();
  const db = await getDb();
  const rows = await db.select().from(insegnanti).where(eq(insegnanti.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createInsegnanteAction(_prev: InsegnanteActionState, formData: FormData): Promise<InsegnanteActionState> {
  await requireWrite();
  const v = validate(parse(formData));
  if ("fieldErrors" in v) return v;
  const db = await getDb();
  await db.insert(insegnanti).values(v.data);
  revalidatePath("/insegnanti");
  revalidatePath("/classi");
  redirect("/insegnanti");
}

export async function updateInsegnanteAction(id: string, _prev: InsegnanteActionState, formData: FormData): Promise<InsegnanteActionState> {
  await requireWrite();
  const v = validate(parse(formData));
  if ("fieldErrors" in v) return v;
  const db = await getDb();
  await db.update(insegnanti).set(v.data).where(eq(insegnanti.id, id));
  revalidatePath("/insegnanti");
  revalidatePath(`/insegnanti/${id}`);
  revalidatePath("/classi");
  redirect("/insegnanti");
}

export async function deleteInsegnanteAction(id: string) {
  await requireWrite();
  const db = await getDb();
  await db.delete(insegnanti).where(eq(insegnanti.id, id));
  revalidatePath("/insegnanti");
  revalidatePath("/classi");
}
