import { z } from "zod";

const requiredString = z.string().trim().min(1, "Campo obbligatorio");
const optionalCodiceFiscale = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase())
  .refine((v) => v === "" || /^[A-Z0-9]{16}$/.test(v), {
    message: "Codice fiscale non valido (16 caratteri)",
  })
  .transform((v) => (v === "" ? null : v));

function parseDataNascita(value: string): string {
  const v = value.trim();
  // accept yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  // accept gg/mm/aaaa
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  if (!m) throw new Error("Formato data non valido (gg/mm/aaaa)");
  const [, dd, mm, yyyy] = m;
  const iso = `${yyyy}-${mm}-${dd}`;
  const d = new Date(`${iso}T00:00:00Z`);
  if (
    Number.isNaN(d.getTime()) ||
    d.getUTCFullYear() !== Number(yyyy) ||
    d.getUTCMonth() + 1 !== Number(mm) ||
    d.getUTCDate() !== Number(dd)
  ) {
    throw new Error("Data non valida");
  }
  return iso;
}

const dataNascitaSchema = z
  .string()
  .trim()
  .min(1, "Campo obbligatorio")
  .superRefine((val, ctx) => {
    try {
      parseDataNascita(val);
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Data non valida (gg/mm/aaaa)" });
    }
  })
  .transform((val) => parseDataNascita(val));

function parseQuota(value: unknown): string {
  if (typeof value === "number") return value.toFixed(2);
  if (typeof value !== "string") throw new Error("Quota non valida");
  const normalized = value.replace(/[€\s]/g, "").replace(/\./g, "").replace(",", ".");
  // allow simple decimals
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) throw new Error("Quota non valida");
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) throw new Error("Quota non valida");
  return n.toFixed(2);
}

const quotaSchema = z
  .union([z.string(), z.number()])
  .transform((v, ctx) => {
    try {
      return parseQuota(v);
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Quota non valida" });
      return z.NEVER;
    }
  });

const tagArraySchema = z
  .array(z.string().trim().min(1))
  .default([])
  .transform((arr) => arr.map((s) => s.trim()).filter(Boolean));

export const iscrittoBaseSchema = z.object({
  codiceNumerico: z.coerce
    .number()
    .refine((v) => !Number.isNaN(v), "Codice numerico non valido")
    .int("Il codice deve essere un numero intero")
    .positive("Il codice deve essere maggiore di 0"),

  cognomePadre: requiredString,
  nomePadre: requiredString,
  cognomeMadre: requiredString,
  nomeMadre: requiredString,

  cognomeIscritto: requiredString,
  nomeIscritto: requiredString,
  natoA: requiredString,
  dataNascita: dataNascitaSchema,
  residenteA: requiredString,
  indirizzoVia: requiredString,

  battezzato: z.boolean(),
  parrocchiaBattesimo: requiredString,

  cellulareGenitore: requiredString,
  telefonoUrgenze: requiredString,
  email: z.string().trim().min(1, "Campo obbligatorio").email("Email non valida"),
  codiceFiscale: optionalCodiceFiscale,

  consensoFotoVideo: z.boolean(),
  classeScolastica: requiredString,
  plessoScolastico: requiredString,

  patologie: tagArraySchema,
  allergieIntolleranze: tagArraySchema,
  altro: z.string().default(""),

  libroConsegnato: z.boolean(),
  quotaVersata: quotaSchema,
  metodoPagamento: z.enum(["POS", "CONTANTI"]),
});

export const iscrittoSchema = iscrittoBaseSchema.superRefine((data, ctx) => {
  if (!data.battezzato && data.parrocchiaBattesimo !== "N/D") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["parrocchiaBattesimo"],
      message: 'Per i non battezzati indicare "N/D"',
    });
  }
});

export type IscrittoInput = z.input<typeof iscrittoSchema>;
export type IscrittoValues = z.output<typeof iscrittoSchema>;
