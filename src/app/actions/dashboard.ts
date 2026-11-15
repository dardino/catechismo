"use server";

import { asc, count, eq, gte } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { appuntamenti, corsi, insegnanti, iscritti, iscrizioniAnni } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { getAnnoScolasticoCorrente } from "@/lib/anno-scolastico";

export async function getDashboardData() {
  await requireUser();
  const db = await getDb();
  const annoCorrente = getAnnoScolasticoCorrente();
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const [
    iscrittiTot,
    iscrittiVisibili,
    iscrizioniAnno,
    appuntamentiTot,
    prossimiAppuntamenti,
    insegnantiTot,
    corsiTot,
  ] = await Promise.all([
    db.select({ value: count() }).from(iscritti),
    db.select({ value: count() }).from(iscritti).where(eq(iscritti.nascosto, false)),
    db.select({ value: count() }).from(iscrizioniAnni).where(eq(iscrizioniAnni.anni, annoCorrente)),
    db.select({ value: count() }).from(appuntamenti),
    db
      .select({
        id: appuntamenti.id,
        data: appuntamenti.data,
        ora: appuntamenti.ora,
        oraFine: appuntamenti.oraFine,
        anni: appuntamenti.anni,
        corsoNome: corsi.nome,
      })
      .from(appuntamenti)
      .innerJoin(corsi, eq(appuntamenti.corsoId, corsi.id))
      .where(gte(appuntamenti.data, todayIso))
      .orderBy(asc(appuntamenti.data), asc(appuntamenti.ora))
      .limit(6),
    db.select({ value: count() }).from(insegnanti),
    db.select({ value: count() }).from(corsi),
  ]);

  const n = (r: { value: number }[]) => Number(r[0]?.value ?? 0);

  return {
    annoCorrente,
    stats: {
      iscrittiTotali: n(iscrittiTot),
      iscrittiAttivi: n(iscrittiVisibili),
      iscrizioniAnnoCorrente: n(iscrizioniAnno),
      appuntamentiTotali: n(appuntamentiTot),
      insegnanti: n(insegnantiTot),
      corsi: n(corsiTot),
    },
    prossimiAppuntamenti,
  };
}
