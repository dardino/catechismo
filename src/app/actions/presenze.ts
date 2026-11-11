"use server";

import { getDb } from "@/lib/db/client";
import { appuntamenti, classi, corsi, insegnanti, iscritti, iscrizioniAnni, presenze } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth/session";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ensureDefaultCorsi } from "./corsi";
import { getAnnoScolasticoCorrente } from "@/lib/anno-scolastico";

export async function getPresenzeFilterOptions() {
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

export async function listAppuntamentiForCorsoAnno(anni: string, corsoId: string) {
  await requireAuth();
  if (!anni || !corsoId) return [];
  const db = await getDb();
  return db
    .select()
    .from(appuntamenti)
    .where(and(eq(appuntamenti.anni, anni), eq(appuntamenti.corsoId, corsoId)))
    .orderBy(asc(appuntamenti.data), asc(appuntamenti.ora));
}

async function getEnrolledIscritti(db: Awaited<ReturnType<typeof getDb>>, anni: string, corsoId: string) {
  return db
    .select({
      id: iscritti.id,
      codiceNumerico: iscritti.codiceNumerico,
      cognomeIscritto: iscritti.cognomeIscritto,
      nomeIscritto: iscritti.nomeIscritto,
    })
    .from(iscrizioniAnni)
    .innerJoin(iscritti, eq(iscrizioniAnni.iscrittoId, iscritti.id))
    .where(and(eq(iscrizioniAnni.anni, anni), eq(iscrizioniAnni.corsoId, corsoId), eq(iscritti.nascosto, false)))
    .orderBy(asc(iscritti.cognomeIscritto), asc(iscritti.nomeIscritto));
}

export async function getPresenzePerAppuntamento(appuntamentoId: string) {
  await requireAuth();
  const db = await getDb();
  const appRows = await db.select().from(appuntamenti).where(eq(appuntamenti.id, appuntamentoId)).limit(1);
  const app = appRows[0];
  if (!app) return [];
  const enrolled = await getEnrolledIscritti(db, app.anni, app.corsoId);
  const rows = await db.select().from(presenze).where(eq(presenze.appuntamentoId, appuntamentoId));
  const presenti = new Set(rows.filter((r) => r.presente).map((r) => r.iscrittoId));
  return enrolled.map((i) => ({ ...i, presente: presenti.has(i.id) }));
}

export async function savePresenzeAction(appuntamentoId: string, presentiIds: string[]) {
  await requireAuth();
  const db = await getDb();
  const appRows = await db.select().from(appuntamenti).where(eq(appuntamenti.id, appuntamentoId)).limit(1);
  const app = appRows[0];
  if (!app) return;
  const enrolled = await getEnrolledIscritti(db, app.anni, app.corsoId);
  const presenti = new Set(presentiIds);
  await db.delete(presenze).where(eq(presenze.appuntamentoId, appuntamentoId));
  if (enrolled.length > 0) {
    await db.insert(presenze).values(
      enrolled.map((i) => ({ appuntamentoId, iscrittoId: i.id, presente: presenti.has(i.id) })),
    );
  }
  revalidatePath("/presenze");
  revalidatePath("/presenze/report");
}

export async function getReportPresenze(filters?: { anni?: string; corsoId?: string }) {
  await requireAuth();
  const db = await getDb();
  const anni = filters?.anni || "";
  const corsoId = filters?.corsoId || "";
  if (!anni || !corsoId) {
    return { appuntamenti: [], iscritti: [], presentiSetKeys: [] as string[], anni, corsoId };
  }
  const [apps, enrolled, pres] = await Promise.all([
    db
      .select()
      .from(appuntamenti)
      .where(and(eq(appuntamenti.anni, anni), eq(appuntamenti.corsoId, corsoId)))
      .orderBy(asc(appuntamenti.data), asc(appuntamenti.ora)),
    db
      .select({
        id: iscritti.id,
        codiceNumerico: iscritti.codiceNumerico,
        cognomeIscritto: iscritti.cognomeIscritto,
        nomeIscritto: iscritti.nomeIscritto,
        insegnanteNome: insegnanti.nome,
      })
      .from(iscrizioniAnni)
      .innerJoin(iscritti, eq(iscrizioniAnni.iscrittoId, iscritti.id))
      .leftJoin(classi, and(eq(classi.iscrittoId, iscritti.id), eq(classi.anni, anni), eq(classi.corsoId, corsoId)))
      .leftJoin(insegnanti, eq(classi.insegnanteId, insegnanti.id))
      .where(and(eq(iscrizioniAnni.anni, anni), eq(iscrizioniAnni.corsoId, corsoId), eq(iscritti.nascosto, false)))
      .orderBy(asc(iscritti.nomeIscritto), asc(iscritti.cognomeIscritto)),
    (async () => {
      const appIds = (await db
        .select({ id: appuntamenti.id })
        .from(appuntamenti)
        .where(and(eq(appuntamenti.anni, anni), eq(appuntamenti.corsoId, corsoId)))).map((a) => a.id);
      if (appIds.length === 0) return [];
      return db
        .select({ appuntamentoId: presenze.appuntamentoId, iscrittoId: presenze.iscrittoId, presente: presenze.presente })
        .from(presenze)
        .where(inArray(presenze.appuntamentoId, appIds));
    })(),
  ]);

  // dedupe (in case of multiple class assignments) and normalize
  const byId = new Map<string, { id: string; codiceNumerico: number; cognomeIscritto: string; nomeIscritto: string; insegnanteNome: string }>();
  for (const r of enrolled) {
    const key = r.id;
    const nome = r.insegnanteNome || "-";
    if (!byId.has(key)) byId.set(key, { id: r.id, codiceNumerico: r.codiceNumerico, cognomeIscritto: r.cognomeIscritto, nomeIscritto: r.nomeIscritto, insegnanteNome: nome });
    else if (byId.get(key)!.insegnanteNome === "-" && nome !== "-") byId.get(key)!.insegnanteNome = nome;
  }
  const iscrittiList = Array.from(byId.values()).sort((a, b) => {
    const ia = a.insegnanteNome === "-" ? "~~~" : a.insegnanteNome.toLocaleLowerCase();
    const ib = b.insegnanteNome === "-" ? "~~~" : b.insegnanteNome.toLocaleLowerCase();
    if (ia !== ib) return ia.localeCompare(ib);
    const na = a.nomeIscritto.toLocaleLowerCase();
    const nb = b.nomeIscritto.toLocaleLowerCase();
    if (na !== nb) return na.localeCompare(nb);
    return a.cognomeIscritto.toLocaleLowerCase().localeCompare(b.cognomeIscritto.toLocaleLowerCase());
  });

  const map = new Set(pres.filter((p) => p.presente).map((p) => `${p.appuntamentoId}:${p.iscrittoId}`));
  return { appuntamenti: apps, iscritti: iscrittiList, presentiSetKeys: Array.from(map), anni, corsoId };
}
