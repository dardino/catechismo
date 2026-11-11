import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { iscritti } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { asc } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvEscape(value: unknown) {
  const s = value == null ? "" : String(value);
  if (/[",\n\r;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  await requireUser();
  const db = await getDb();
  const rows = await db.select().from(iscritti).orderBy(asc(iscritti.cognomeIscritto), asc(iscritti.nomeIscritto));

  const headers = [
    "codiceNumerico","cognomeIscritto","nomeIscritto","natoA","dataNascita","residenteA","indirizzoVia",
    "battezzato","parrocchiaBattesimo","cellulareGenitore","telefonoUrgenze","email","codiceFiscale",
    "consensoFotoVideo","classeScolastica","plessoScolastico","patologie","allergieIntolleranze","altro",
    "libroConsegnato","quotaVersata","metodoPagamento","nascosto",
    "cognomePadre","nomePadre","cognomeMadre","nomeMadre"
  ];
  const lines = [headers.join(";")];
  for (const r of rows) {
    lines.push([
      r.codiceNumerico, r.cognomeIscritto, r.nomeIscritto, r.natoA, r.dataNascita, r.residenteA, r.indirizzoVia,
      r.battezzato ? "SI" : "NO", r.parrocchiaBattesimo, r.cellulareGenitore, r.telefonoUrgenze, r.email, r.codiceFiscale || "",
      r.consensoFotoVideo ? "SI" : "NO", r.classeScolastica, r.plessoScolastico,
      (r.patologie || []).join("|"), (r.allergieIntolleranze || []).join("|"), r.altro || "",
      r.libroConsegnato ? "SI" : "NO", r.quotaVersata, r.metodoPagamento, r.nascosto ? "SI" : "NO",
      r.cognomePadre, r.nomePadre, r.cognomeMadre, r.nomeMadre,
    ].map(csvEscape).join(";"));
  }
  const csv = "\uFEFF" + lines.join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="anagrafica-iscritti.csv"',
    },
  });
}
