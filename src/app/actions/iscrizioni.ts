"use server";

import { getDb } from "@/lib/db/client";
import { corsi, insegnanti, iscritti, iscrizioniAnni } from "@/lib/db/schema";
import { requireUser, requireWrite } from "@/lib/auth/session";
import { getAnnoScolasticoCorrente } from "@/lib/anno-scolastico";
import { and, asc, desc, eq, type SQL } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ensureDefaultCorsi } from "./corsi";

export async function getIscrizioniPageData(filters?: { anni?: string; corsoId?: string }) {
  await requireUser();
  await ensureDefaultCorsi();
  const db = await getDb();
  const whereParts: SQL[] = [];
  if (filters?.anni) whereParts.push(eq(iscrizioniAnni.anni, filters.anni));
  if (filters?.corsoId) whereParts.push(eq(iscrizioniAnni.corsoId, filters.corsoId));
  const where = whereParts.length ? and(...whereParts) : undefined;

  const [rows, corsiRows, iscrittiRows, anniRows, insegnantiRows] = await Promise.all([
    db
      .select({
        id: iscrizioniAnni.id,
        dataIscrizione: iscrizioniAnni.dataIscrizione,
        anni: iscrizioniAnni.anni,
        corsoId: iscrizioniAnni.corsoId,
        corsoNome: corsi.nome,
        libro: iscrizioniAnni.libro,
        quota: iscrizioniAnni.quota,
        classe: iscrizioniAnni.classe,
        plesso: iscrizioniAnni.plesso,
        iscrittoId: iscrizioniAnni.iscrittoId,
        codiceNumerico: iscritti.codiceNumerico,
        cognomeIscritto: iscritti.cognomeIscritto,
        nomeIscritto: iscritti.nomeIscritto,
        preferenzaInsegnanteId: iscrizioniAnni.preferenzaInsegnanteId,
        preferenzaInsegnanteNome: insegnanti.nome,
      })
      .from(iscrizioniAnni)
      .innerJoin(iscritti, eq(iscrizioniAnni.iscrittoId, iscritti.id))
      .innerJoin(corsi, eq(iscrizioniAnni.corsoId, corsi.id))
      .leftJoin(insegnanti, eq(iscrizioniAnni.preferenzaInsegnanteId, insegnanti.id))
      .where(where)
      .orderBy(desc(iscrizioniAnni.dataIscrizione), asc(iscritti.cognomeIscritto), asc(iscritti.nomeIscritto)),
    db.select().from(corsi).orderBy(asc(corsi.ordine), asc(corsi.nome)),
    db
      .select({
        id: iscritti.id,
        codiceNumerico: iscritti.codiceNumerico,
        cognomeIscritto: iscritti.cognomeIscritto,
        nomeIscritto: iscritti.nomeIscritto,
        classeScolastica: iscritti.classeScolastica,
        plessoScolastico: iscritti.plessoScolastico,
        libroConsegnato: iscritti.libroConsegnato,
        quotaVersata: iscritti.quotaVersata,
      })
      .from(iscritti)
      .where(eq(iscritti.nascosto, false))
      .orderBy(asc(iscritti.cognomeIscritto), asc(iscritti.nomeIscritto)),
    db.select({ anni: iscrizioniAnni.anni }).from(iscrizioniAnni).groupBy(iscrizioniAnni.anni).orderBy(desc(iscrizioniAnni.anni)),
    db.select({ id: insegnanti.id, nome: insegnanti.nome }).from(insegnanti).orderBy(asc(insegnanti.nome)),
  ]);

  const anniSet = new Set(anniRows.map((r) => r.anni));
  const corrente = getAnnoScolasticoCorrente();
  anniSet.add(corrente);
  const anniOptions = Array.from(anniSet).sort().reverse();

  return { rows, corsi: corsiRows, iscritti: iscrittiRows, anniOptions, annoCorrente: corrente, insegnanti: insegnantiRows };
}

export type IscrizioneActionState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string[]> };

function parseQuota(v: string) {
  const normalized = v.replace(/[€\s]/g, "").replace(/\./g, "").replace(",", ".");
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return n.toFixed(2);
}

export async function createIscrizioneAnnoAction(_prev: IscrizioneActionState, formData: FormData): Promise<IscrizioneActionState> {
  await requireWrite();
  const iscrittoId = String(formData.get("iscrittoId") || "");
  const dataIscrizione = String(formData.get("dataIscrizione") || "").trim();
  const anni = String(formData.get("anni") || "").trim();
  const corsoId = String(formData.get("corsoId") || "");
  const preferenzaInsegnanteIdRaw = String(formData.get("preferenzaInsegnanteId") || "").trim();
  const preferenzaInsegnanteId = preferenzaInsegnanteIdRaw || null;
  const libro = formData.get("libro") === "on" || formData.get("libro") === "true";
  const quotaRaw = String(formData.get("quota") || "0").trim();
  const classe = String(formData.get("classe") || "").trim();
  const plesso = String(formData.get("plesso") || "").trim();

  const fieldErrors: Record<string, string[]> = {};
  if (!iscrittoId) fieldErrors.iscrittoId = ["Seleziona un iscritto"];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataIscrizione)) fieldErrors.dataIscrizione = ["Data non valida"];
  if (!anni) fieldErrors.anni = ["Campo obbligatorio"];
  if (!corsoId) fieldErrors.corsoId = ["Seleziona un corso"];
  const quota = parseQuota(quotaRaw);
  if (quota == null) fieldErrors.quota = ["Quota non valida"];
  if (!classe) fieldErrors.classe = ["Campo obbligatorio"];
  if (!plesso) fieldErrors.plesso = ["Campo obbligatorio"];
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const db = await getDb();
  try {
    await db.insert(iscrizioniAnni).values({ iscrittoId, dataIscrizione, anni, corsoId, preferenzaInsegnanteId, libro, quota: quota!, classe, plesso });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes("unique")) return { error: "Iscrizione già presente per questo iscritto, anno e corso." };
    return { error: "Errore durante il salvataggio." };
  }
  revalidatePath("/iscrizioni");
  revalidatePath("/classi");
  revalidatePath("/presenze");
  return { ok: true };
}

export async function updateIscrizioneAnnoAction(id: string, _prev: IscrizioneActionState, formData: FormData): Promise<IscrizioneActionState> {
  await requireWrite();
  const iscrittoId = String(formData.get("iscrittoId") || "");
  const dataIscrizione = String(formData.get("dataIscrizione") || "").trim();
  const anni = String(formData.get("anni") || "").trim();
  const corsoId = String(formData.get("corsoId") || "");
  const preferenzaInsegnanteIdRaw = String(formData.get("preferenzaInsegnanteId") || "").trim();
  const preferenzaInsegnanteId = preferenzaInsegnanteIdRaw || null;
  const libro = formData.get("libro") === "on" || formData.get("libro") === "true";
  const quotaRaw = String(formData.get("quota") || "0").trim();
  const classe = String(formData.get("classe") || "").trim();
  const plesso = String(formData.get("plesso") || "").trim();

  const fieldErrors: Record<string, string[]> = {};
  if (!iscrittoId) fieldErrors.iscrittoId = ["Seleziona un iscritto"];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataIscrizione)) fieldErrors.dataIscrizione = ["Data non valida"];
  if (!anni) fieldErrors.anni = ["Campo obbligatorio"];
  if (!corsoId) fieldErrors.corsoId = ["Seleziona un corso"];
  const quota = parseQuota(quotaRaw);
  if (quota == null) fieldErrors.quota = ["Quota non valida"];
  if (!classe) fieldErrors.classe = ["Campo obbligatorio"];
  if (!plesso) fieldErrors.plesso = ["Campo obbligatorio"];
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const db = await getDb();
  try {
    await db
      .update(iscrizioniAnni)
      .set({ iscrittoId, dataIscrizione, anni, corsoId, preferenzaInsegnanteId, libro, quota: quota!, classe, plesso })
      .where(eq(iscrizioniAnni.id, id));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes("unique")) return { error: "Iscrizione già presente per questo iscritto, anno e corso." };
    return { error: "Errore durante il salvataggio." };
  }
  revalidatePath("/iscrizioni");
  revalidatePath("/classi");
  revalidatePath("/presenze");
  return { ok: true };
}

export async function deleteIscrizioneAnnoAction(id: string) {
  await requireWrite();
  const db = await getDb();
  await db.delete(iscrizioniAnni).where(eq(iscrizioniAnni.id, id));
  revalidatePath("/iscrizioni");
  revalidatePath("/classi");
  revalidatePath("/presenze");
}
