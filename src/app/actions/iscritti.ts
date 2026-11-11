"use server";

import { getDb } from "@/lib/db/client";
import { iscritti } from "@/lib/db/schema";
import { iscrittoSchema, type IscrittoInput } from "@/lib/validators/iscritto";
import { requireUser, requireWrite } from "@/lib/auth/session";
import { desc, eq, ilike, max, or, type SQL } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function listIscritti(query?: string) {
  await requireUser();
  const db = await getDb();
  const q = query?.trim();
  let where: SQL | undefined;
  if (q) {
    const like = `%${q}%`;
    where = or(
      ilike(iscritti.cognomeIscritto, like),
      ilike(iscritti.nomeIscritto, like),
      ilike(iscritti.cognomePadre, like),
      ilike(iscritti.cognomeMadre, like),
    );
  }
  return db
    .select()
    .from(iscritti)
    .where(where)
    .orderBy(desc(iscritti.createdAt));
}

export async function getIscritto(id: string) {
  await requireUser();
  const db = await getDb();
  const rows = await db.select().from(iscritti).where(eq(iscritti.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getNextCodiceNumerico() {
  await requireUser();
  const db = await getDb();
  const result = await db.select({ value: max(iscritti.codiceNumerico) }).from(iscritti);
  const current = result[0]?.value ?? 0;
  return Number(current) + 1;
}

function parseFormData(formData: FormData): IscrittoInput {
  const get = (k: string) => String(formData.get(k) ?? "");
  const getBool = (k: string) => formData.get(k) === "on" || formData.get(k) === "true";
  const getTags = (k: string) => {
    const raw = formData.getAll(k).map((v) => String(v)).filter((v) => v.trim() !== "");
    // support JSON array field as fallback
    if (raw.length === 1) {
      try {
        const parsed = JSON.parse(raw[0]);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch {}
    }
    return raw;
  };
  return {
    codiceNumerico: get("codiceNumerico"),
    cognomePadre: get("cognomePadre"),
    nomePadre: get("nomePadre"),
    cognomeMadre: get("cognomeMadre"),
    nomeMadre: get("nomeMadre"),
    cognomeIscritto: get("cognomeIscritto"),
    nomeIscritto: get("nomeIscritto"),
    natoA: get("natoA"),
    dataNascita: get("dataNascita"),
    residenteA: get("residenteA"),
    indirizzoVia: get("indirizzoVia"),
    battezzato: getBool("battezzato"),
    parrocchiaBattesimo: get("parrocchiaBattesimo"),
    cellulareGenitore: get("cellulareGenitore"),
    telefonoUrgenze: get("telefonoUrgenze"),
    email: get("email"),
    codiceFiscale: get("codiceFiscale"),
    consensoFotoVideo: getBool("consensoFotoVideo"),
    classeScolastica: get("classeScolastica"),
    plessoScolastico: get("plessoScolastico"),
    patologie: getTags("patologie"),
    allergieIntolleranze: getTags("allergieIntolleranze"),
    altro: get("altro"),
    libroConsegnato: getBool("libroConsegnato"),
    quotaVersata: get("quotaVersata"),
    metodoPagamento: get("metodoPagamento") as "POS" | "CONTANTI",
  };
}

export type IscrittoActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createIscrittoAction(
  _prev: IscrittoActionState,
  formData: FormData,
): Promise<IscrittoActionState> {
  await requireWrite();
  const parsed = iscrittoSchema.safeParse(parseFormData(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }
  const db = await getDb();
  try {
    await db.insert(iscritti).values(parsed.data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("codice_numerico") || msg.toLowerCase().includes("unique")) {
      return { fieldErrors: { codiceNumerico: ["Codice numerico già esistente"] } };
    }
    return { error: "Errore durante il salvataggio." };
  }
  revalidatePath("/iscritti");
  redirect("/iscritti");
}

export async function updateIscrittoAction(
  id: string,
  _prev: IscrittoActionState,
  formData: FormData,
): Promise<IscrittoActionState> {
  await requireWrite();
  const parsed = iscrittoSchema.safeParse(parseFormData(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }
  const db = await getDb();
  try {
    await db
      .update(iscritti)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(iscritti.id, id));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("codice_numerico") || msg.toLowerCase().includes("unique")) {
      return { fieldErrors: { codiceNumerico: ["Codice numerico già esistente"] } };
    }
    return { error: "Errore durante il salvataggio." };
  }
  revalidatePath("/iscritti");
  revalidatePath(`/iscritti/${id}`);
  redirect("/iscritti");
}

export async function deleteIscrittoAction(id: string) {
  await requireWrite();
  const db = await getDb();
  await db.delete(iscritti).where(eq(iscritti.id, id));
  revalidatePath("/iscritti");
  revalidatePath("/classi");
  revalidatePath("/presenze");
  revalidatePath("/presenze/report");
}

export async function toggleIscrittoNascostoAction(id: string, nascosto: boolean) {
  await requireWrite();
  const db = await getDb();
  await db.update(iscritti).set({ nascosto, updatedAt: new Date() }).where(eq(iscritti.id, id));
  revalidatePath("/iscritti");
  revalidatePath("/classi");
  revalidatePath("/presenze");
  revalidatePath("/presenze/report");
}

export type ImportIscrittiResult = { imported: number; updated: number; errors: string[] };

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const input = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (inQuotes) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ";") {
        row.push(field);
        field = "";
      } else if (c === "\n") {
        row.push(field);
        field = "";
        if (row.some((cell) => cell.trim() !== "")) rows.push(row);
        row = [];
      } else if (c === "\r") {
        // ignore
      } else {
        field += c;
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  }
  if (rows.length === 0) return { headers: [], rows: [] };
  const headers = rows[0].map((h) => h.trim());
  return { headers, rows: rows.slice(1) };
}

function parseBool(v: string | undefined): boolean {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "si" || s === "sì" || s === "true" || s === "1" || s === "yes" || s === "on";
}

function parseList(v: string | undefined): string[] {
  const s = String(v ?? "").trim();
  if (!s) return [];
  return s.split("|").map((x) => x.trim()).filter(Boolean);
}

export async function importIscrittiFromCsvAction(formData: FormData): Promise<ImportIscrittiResult> {
  await requireWrite();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { imported: 0, updated: 0, errors: ["Seleziona un file CSV valido."] };
  }
  let text = "";
  try {
    text = await file.text();
  } catch {
    return { imported: 0, updated: 0, errors: ["Impossibile leggere il file."] };
  }

  const { headers, rows } = parseCsv(text);
  if (headers.length === 0) return { imported: 0, updated: 0, errors: ["File CSV vuoto o non valido."] };
  const idx = (name: string) => headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());
  const get = (r: string[], name: string) => {
    const i = idx(name);
    return i >= 0 ? (r[i] ?? "") : "";
  };

  const db = await getDb();
  let imported = 0;
  let updated = 0;
  const errors: string[] = [];

  for (let n = 0; n < rows.length; n++) {
    const r = rows[n];
    const rowNum = n + 2; // header is 1
    try {
      const raw: Record<string, unknown> = {
        codiceNumerico: get(r, "codiceNumerico"),
        cognomePadre: get(r, "cognomePadre"),
        nomePadre: get(r, "nomePadre"),
        cognomeMadre: get(r, "cognomeMadre"),
        nomeMadre: get(r, "nomeMadre"),
        cognomeIscritto: get(r, "cognomeIscritto"),
        nomeIscritto: get(r, "nomeIscritto"),
        natoA: get(r, "natoA"),
        dataNascita: get(r, "dataNascita"),
        residenteA: get(r, "residenteA"),
        indirizzoVia: get(r, "indirizzoVia"),
        battezzato: parseBool(get(r, "battezzato")),
        parrocchiaBattesimo: get(r, "parrocchiaBattesimo"),
        cellulareGenitore: get(r, "cellulareGenitore"),
        telefonoUrgenze: get(r, "telefonoUrgenze"),
        email: get(r, "email"),
        codiceFiscale: get(r, "codiceFiscale"),
        consensoFotoVideo: parseBool(get(r, "consensoFotoVideo")),
        classeScolastica: get(r, "classeScolastica"),
        plessoScolastico: get(r, "plessoScolastico"),
        patologie: parseList(get(r, "patologie")),
        allergieIntolleranze: parseList(get(r, "allergieIntolleranze")),
        altro: get(r, "altro"),
        libroConsegnato: parseBool(get(r, "libroConsegnato")),
        quotaVersata: get(r, "quotaVersata") || "0",
        metodoPagamento: (get(r, "metodoPagamento") || "CONTANTI").toUpperCase(),
      };

      const parsed = iscrittoSchema.safeParse(raw);
      if (!parsed.success) {
        const msg = parsed.error.issues.map((i) => `${i.path.join(".") || "campo"}: ${i.message}`).join("; ");
        errors.push(`Riga ${rowNum}: ${msg}`);
        continue;
      }

      const nascostoRaw = get(r, "nascosto");
      const hasNascosto = idx("nascosto") >= 0;
      const nascosto = hasNascosto ? parseBool(nascostoRaw) : undefined;
      const values = { ...parsed.data, ...(nascosto !== undefined ? { nascosto } : {}) };

      const existing = await db
        .select({ id: iscritti.id })
        .from(iscritti)
        .where(eq(iscritti.codiceNumerico, values.codiceNumerico))
        .limit(1);

      if (existing[0]) {
        await db
          .update(iscritti)
          .set({ ...values, updatedAt: new Date() })
          .where(eq(iscritti.id, existing[0].id));
        updated++;
      } else {
        await db.insert(iscritti).values(values as typeof iscritti.$inferInsert);
        imported++;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Riga ${rowNum}: ${msg}`);
    }
  }

  if (imported > 0 || updated > 0) {
    revalidatePath("/iscritti");
    revalidatePath("/classi");
    revalidatePath("/presenze");
    revalidatePath("/presenze/report");
  }
  return { imported, updated, errors };
}
