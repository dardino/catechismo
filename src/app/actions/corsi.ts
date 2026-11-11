"use server";

import { getDb } from "@/lib/db/client";
import { corsi } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/session";
import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const DEFAULT_CORSI = [
  "1. Con Te Figli (II elementare)",
  "2. Con Te Discepoli (III elementare)",
  "3. Con Te Amici (Anno di comunione)",
  "4. Con Te Cristiani (Anno di cresima)",
];

export async function ensureDefaultCorsi() {
  const db = await getDb();
  const existing = await db.select().from(corsi).limit(1);
  if (existing.length === 0) {
    await db.insert(corsi).values(DEFAULT_CORSI.map((nome, i) => ({ nome, ordine: i + 1 })));
  }
}

export async function listCorsi() {
  await requireAuth();
  await ensureDefaultCorsi();
  const db = await getDb();
  return db.select().from(corsi).orderBy(asc(corsi.ordine), asc(corsi.nome));
}

export type CorsoActionState = { error?: string; fieldErrors?: Record<string, string[]> };

export async function createCorsoAction(_prev: CorsoActionState, formData: FormData): Promise<CorsoActionState> {
  await requireAuth();
  const nome = String(formData.get("nome") || "").trim();
  const ordine = Number(formData.get("ordine") || 0);
  if (!nome) return { fieldErrors: { nome: ["Campo obbligatorio"] } };
  const db = await getDb();
  try {
    await db.insert(corsi).values({ nome, ordine: Number.isFinite(ordine) ? ordine : 0 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes("unique")) return { fieldErrors: { nome: ["Corso già esistente"] } };
    return { error: "Errore durante il salvataggio." };
  }
  revalidatePath("/configurazione");
  revalidatePath("/iscrizioni");
  return {};
}

export async function updateCorsoAction(id: string, _prev: CorsoActionState, formData: FormData): Promise<CorsoActionState> {
  await requireAuth();
  const nome = String(formData.get("nome") || "").trim();
  const ordine = Number(formData.get("ordine") || 0);
  if (!nome) return { fieldErrors: { nome: ["Campo obbligatorio"] } };
  const db = await getDb();
  try {
    await db.update(corsi).set({ nome, ordine: Number.isFinite(ordine) ? ordine : 0 }).where(eq(corsi.id, id));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes("unique")) return { fieldErrors: { nome: ["Corso già esistente"] } };
    return { error: "Errore durante il salvataggio." };
  }
  revalidatePath("/configurazione");
  revalidatePath("/iscrizioni");
  return {};
}

export async function deleteCorsoAction(id: string) {
  await requireAuth();
  const db = await getDb();
  try {
    await db.delete(corsi).where(eq(corsi.id, id));
  } catch {
    // may be referenced by iscrizioni_anni (restrict)
  }
  revalidatePath("/configurazione");
  revalidatePath("/iscrizioni");
}
