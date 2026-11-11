"use server";

import { getDb } from "@/lib/db/client";
import { classi, corsi, insegnanti, iscritti, iscrizioniAnni } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/session";
import { and, asc, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ensureDefaultCorsi } from "./corsi";
import { getAnnoScolasticoCorrente } from "@/lib/anno-scolastico";

export async function getClassiFilterOptions() {
  await requireAuth();
  await ensureDefaultCorsi();
  const db = await getDb();
  const [corsiRows, anniRows] = await Promise.all([
    db.select().from(corsi).orderBy(asc(corsi.ordine), asc(corsi.nome)),
    db.select({ anni: iscrizioniAnni.anni }).from(iscrizioniAnni).groupBy(iscrizioniAnni.anni).orderBy(desc(iscrizioniAnni.anni)),
  ]);
  const anniSet = new Set(anniRows.map((r) => r.anni));
  anniSet.add(getAnnoScolasticoCorrente());
  return { corsi: corsiRows, anniOptions: Array.from(anniSet).sort().reverse() };
}

export async function listClassi(filters?: { anni?: string; corsoId?: string }) {
  await requireAuth();
  const db = await getDb();
  const anni = filters?.anni || "";
  const corsoId = filters?.corsoId || "";
  if (!anni || !corsoId) return [];
  return db
    .select({
      id: classi.id,
      iscrittoId: classi.iscrittoId,
      insegnanteId: classi.insegnanteId,
      anni: classi.anni,
      corsoId: classi.corsoId,
      codiceNumerico: iscritti.codiceNumerico,
      cognomeIscritto: iscritti.cognomeIscritto,
      nomeIscritto: iscritti.nomeIscritto,
      insegnanteNome: insegnanti.nome,
    })
    .from(classi)
    .innerJoin(iscritti, eq(classi.iscrittoId, iscritti.id))
    .innerJoin(insegnanti, eq(classi.insegnanteId, insegnanti.id))
    .where(and(eq(classi.anni, anni), eq(classi.corsoId, corsoId), eq(iscritti.nascosto, false)))
    .orderBy(asc(insegnanti.nome), asc(iscritti.cognomeIscritto), asc(iscritti.nomeIscritto));
}

export async function listIscrittiOptionsForAnnoCorso(anni: string, corsoId: string) {
  await requireAuth();
  if (!anni || !corsoId) return [];
  const db = await getDb();
  return db
    .select({
      id: iscritti.id,
      codiceNumerico: iscritti.codiceNumerico,
      cognomeIscritto: iscritti.cognomeIscritto,
      nomeIscritto: iscritti.nomeIscritto,
      preferenzaInsegnanteId: iscrizioniAnni.preferenzaInsegnanteId,
    })
    .from(iscrizioniAnni)
    .innerJoin(iscritti, eq(iscrizioniAnni.iscrittoId, iscritti.id))
    .where(and(eq(iscrizioniAnni.anni, anni), eq(iscrizioniAnni.corsoId, corsoId), eq(iscritti.nascosto, false)))
    .orderBy(asc(iscritti.cognomeIscritto), asc(iscritti.nomeIscritto));
}

export async function saveClassiBulkAction(
  anni: string,
  corsoId: string,
  assignments: { iscrittoId: string; insegnanteId: string }[],
) {
  await requireAuth();
  if (!anni || !corsoId) return { error: "Seleziona anno e corso." };
  const db = await getDb();
  try {
    await db.delete(classi).where(and(eq(classi.anni, anni), eq(classi.corsoId, corsoId)));
    if (assignments.length > 0) {
      const values = assignments
        .filter((a) => a.iscrittoId && a.insegnanteId)
        .map((a) => ({ anni, corsoId, iscrittoId: a.iscrittoId, insegnanteId: a.insegnanteId }));
      // de-duplicate by iscrittoId+insegnanteId (unique constraint)
      const seen = new Set<string>();
      const deduped = values.filter((v) => {
        const k = `${v.iscrittoId}|${v.insegnanteId}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      if (deduped.length > 0) await db.insert(classi).values(deduped);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: `Errore durante il salvataggio: ${msg}` };
  }
  revalidatePath("/classi");
  return { ok: true };
}

export async function listInsegnantiOptions() {
  await requireAuth();
  const db = await getDb();
  return db.select({ id: insegnanti.id, nome: insegnanti.nome }).from(insegnanti).orderBy(asc(insegnanti.nome));
}

export async function createClasseAction(_prev: { error?: string; ok?: boolean } | undefined, formData: FormData) {
  await requireAuth();
  const anni = String(formData.get("anni") || "").trim();
  const corsoId = String(formData.get("corsoId") || "").trim();
  const iscrittoId = String(formData.get("iscrittoId") || "");
  const insegnanteId = String(formData.get("insegnanteId") || "");
  if (!anni || !corsoId) return { error: "Seleziona prima anno e corso." };
  if (!iscrittoId || !insegnanteId) return { error: "Seleziona iscritto e insegnante." };
  const db = await getDb();
  try {
    await db.insert(classi).values({ anni, corsoId, iscrittoId, insegnanteId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes("unique")) return { error: "Abbinamento già esistente per questo anno/corso." };
    return { error: "Errore durante il salvataggio." };
  }
  revalidatePath("/classi");
  return { ok: true };
}

export async function deleteClasseAction(id: string) {
  await requireAuth();
  const db = await getDb();
  await db.delete(classi).where(eq(classi.id, id));
  revalidatePath("/classi");
}
