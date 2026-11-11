"use server";

import { getDb } from "@/lib/db/client";
import { appuntamenti, corsi } from "@/lib/db/schema";
import { requireUser, requireWrite } from "@/lib/auth/session";
import { and, asc, desc, eq, type SQL } from "drizzle-orm";
import { getAnnoScolasticoCorrente } from "@/lib/anno-scolastico";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureDefaultCorsi } from "./corsi";

export type AppuntamentoActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function parse(formData: FormData) {
  return {
    data: String(formData.get("data") || "").trim(),
    ora: String(formData.get("ora") || "").trim(),
    oraFine: String(formData.get("oraFine") || "").trim(),
    anni: String(formData.get("anni") || "").trim(),
    corsoId: String(formData.get("corsoId") || "").trim(),
  };
}

function validate(input: { data: string; ora: string; oraFine: string; anni: string; corsoId: string }) {
  const fieldErrors: Record<string, string[]> = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.data)) fieldErrors.data = ["Data non valida"];
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(input.ora)) fieldErrors.ora = ["Ora non valida"];
  if (input.oraFine && !/^\d{2}:\d{2}(:\d{2})?$/.test(input.oraFine)) fieldErrors.oraFine = ["Ora fine non valida"];
  if (!input.anni) fieldErrors.anni = ["Campo obbligatorio"];
  if (!input.corsoId) fieldErrors.corsoId = ["Seleziona un corso"];
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  const ora = input.ora.length === 5 ? `${input.ora}:00` : input.ora;
  const oraFine = input.oraFine ? (input.oraFine.length === 5 ? `${input.oraFine}:00` : input.oraFine) : null;
  return { data: { data: input.data, ora, oraFine, anni: input.anni, corsoId: input.corsoId } };
}

export async function getAppuntamentiFilterOptions() {
  await requireUser();
  await ensureDefaultCorsi();
  const db = await getDb();
  const [corsiRows, anniRows] = await Promise.all([
    db.select().from(corsi).orderBy(asc(corsi.ordine), asc(corsi.nome)),
    db.select({ anni: appuntamenti.anni }).from(appuntamenti).groupBy(appuntamenti.anni).orderBy(desc(appuntamenti.anni)),
  ]);
  const anniSet = new Set(anniRows.map((r) => r.anni));
  anniSet.add(getAnnoScolasticoCorrente());
  return { corsi: corsiRows, anniOptions: Array.from(anniSet).sort().reverse() };
}

export async function listAppuntamenti(filters?: { anni?: string; corsoId?: string }) {
  await requireUser();
  const db = await getDb();
  const conds: SQL[] = [];
  if (filters?.anni) conds.push(eq(appuntamenti.anni, filters.anni));
  if (filters?.corsoId) conds.push(eq(appuntamenti.corsoId, filters.corsoId));
  const where = conds.length ? and(...conds) : undefined;
  return db
    .select({
      id: appuntamenti.id,
      data: appuntamenti.data,
      ora: appuntamenti.ora,
      oraFine: appuntamenti.oraFine,
      anni: appuntamenti.anni,
      corsoId: appuntamenti.corsoId,
      corsoNome: corsi.nome,
      createdAt: appuntamenti.createdAt,
    })
    .from(appuntamenti)
    .innerJoin(corsi, eq(appuntamenti.corsoId, corsi.id))
    .where(where)
    .orderBy(asc(appuntamenti.data), asc(appuntamenti.ora));
}

export async function getAppuntamento(id: string) {
  await requireUser();
  const db = await getDb();
  const rows = await db.select().from(appuntamenti).where(eq(appuntamenti.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getUltimoAppuntamento() {
  await requireUser();
  const db = await getDb();
  const rows = await db
    .select()
    .from(appuntamenti)
    .orderBy(desc(appuntamenti.data), desc(appuntamenti.ora), desc(appuntamenti.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function getAppuntamentoFormData() {
  await requireUser();
  await ensureDefaultCorsi();
  const db = await getDb();
  const [corsiRows, ultimo] = await Promise.all([
    db.select().from(corsi).orderBy(asc(corsi.ordine), asc(corsi.nome)),
    db
      .select()
      .from(appuntamenti)
      .orderBy(desc(appuntamenti.data), desc(appuntamenti.ora), desc(appuntamenti.createdAt))
      .limit(1),
  ]);
  return { corsi: corsiRows, ultimo: ultimo[0] ?? null };
}

export async function createAppuntamentoAction(_prev: AppuntamentoActionState, formData: FormData): Promise<AppuntamentoActionState> {
  await requireWrite();
  const v = validate(parse(formData));
  if ("fieldErrors" in v) return v;
  const db = await getDb();
  await db.insert(appuntamenti).values(v.data);
  revalidatePath("/appuntamenti");
  revalidatePath("/presenze");
  redirect("/appuntamenti");
}

export async function updateAppuntamentoAction(id: string, _prev: AppuntamentoActionState, formData: FormData): Promise<AppuntamentoActionState> {
  await requireWrite();
  const v = validate(parse(formData));
  if ("fieldErrors" in v) return v;
  const db = await getDb();
  await db.update(appuntamenti).set(v.data).where(eq(appuntamenti.id, id));
  revalidatePath("/appuntamenti");
  revalidatePath(`/appuntamenti/${id}`);
  revalidatePath("/presenze");
  redirect("/appuntamenti");
}

export async function deleteAppuntamentoAction(id: string) {
  await requireWrite();
  const db = await getDb();
  await db.delete(appuntamenti).where(eq(appuntamenti.id, id));
  revalidatePath("/appuntamenti");
  revalidatePath("/presenze");
}
