import {
  boolean,
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const metodoPagamentoEnum = pgEnum("metodo_pagamento", ["POS", "CONTANTI"]);

export const iscritti = pgTable("iscritti", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),

  cognomePadre: text("cognome_padre").notNull(),
  nomePadre: text("nome_padre").notNull(),
  cognomeMadre: text("cognome_madre").notNull(),
  nomeMadre: text("nome_madre").notNull(),

  codiceNumerico: integer("codice_numerico").notNull().unique(),
  cognomeIscritto: text("cognome_iscritto").notNull(),
  nomeIscritto: text("nome_iscritto").notNull(),
  natoA: text("nato_a").notNull(),
  dataNascita: date("data_nascita").notNull(),
  residenteA: text("residente_a").notNull(),
  indirizzoVia: text("indirizzo_via").notNull(),

  battezzato: boolean("battezzato").notNull(),
  parrocchiaBattesimo: text("parrocchia_battesimo").notNull(),

  cellulareGenitore: text("cellulare_genitore").notNull(),
  telefonoUrgenze: text("telefono_urgenze").notNull(),
  email: text("email").notNull(),
  codiceFiscale: text("codice_fiscale"),

  consensoFotoVideo: boolean("consenso_foto_video").notNull(),
  classeScolastica: text("classe_scolastica").notNull(),
  plessoScolastico: text("plesso_scolastico").notNull(),

  patologie: text("patologie").array().notNull().default([]),
  allergieIntolleranze: text("allergie_intolleranze").array().notNull().default([]),
  altro: text("altro").notNull().default(""),

  libroConsegnato: boolean("libro_consegnato").notNull(),
  quotaVersata: numeric("quota_versata", { precision: 10, scale: 2 }).notNull(),
  metodoPagamento: metodoPagamentoEnum("metodo_pagamento").notNull(),
  nascosto: boolean("nascosto").notNull().default(false),
});

export type Iscritto = typeof iscritti.$inferSelect;
export type NewIscritto = typeof iscritti.$inferInsert;

export const appuntamenti = pgTable("appuntamenti", {
  id: uuid("id").defaultRandom().primaryKey(),
  data: date("data").notNull(),
  ora: time("ora").notNull(),
  oraFine: time("ora_fine"),
  anni: text("anni").notNull(),
  corsoId: uuid("corso_id")
    .notNull()
    .references(() => corsi.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Appuntamento = typeof appuntamenti.$inferSelect;
export type NewAppuntamento = typeof appuntamenti.$inferInsert;

export const insegnanti = pgTable("insegnanti", {
  id: uuid("id").defaultRandom().primaryKey(),
  nome: text("nome").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Insegnante = typeof insegnanti.$inferSelect;
export type NewInsegnante = typeof insegnanti.$inferInsert;

export const classi = pgTable(
  "classi",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    anni: text("anni").notNull(),
    corsoId: uuid("corso_id")
      .notNull()
      .references(() => corsi.id, { onDelete: "restrict" }),
    iscrittoId: uuid("iscritto_id")
      .notNull()
      .references(() => iscritti.id, { onDelete: "cascade" }),
    insegnanteId: uuid("insegnante_id")
      .notNull()
      .references(() => insegnanti.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("classi_iscritto_insegnante_anni_corso_uq").on(t.iscrittoId, t.insegnanteId, t.anni, t.corsoId)],
);

export type Classe = typeof classi.$inferSelect;
export type NewClasse = typeof classi.$inferInsert;

export const presenze = pgTable(
  "presenze",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    appuntamentoId: uuid("appuntamento_id")
      .notNull()
      .references(() => appuntamenti.id, { onDelete: "cascade" }),
    iscrittoId: uuid("iscritto_id")
      .notNull()
      .references(() => iscritti.id, { onDelete: "cascade" }),
    presente: boolean("presente").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("presenze_appuntamento_iscritto_uq").on(t.appuntamentoId, t.iscrittoId)],
);

export type Presenza = typeof presenze.$inferSelect;
export type NewPresenza = typeof presenze.$inferInsert;

export const corsi = pgTable("corsi", {
  id: uuid("id").defaultRandom().primaryKey(),
  nome: text("nome").notNull().unique(),
  ordine: integer("ordine").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Corso = typeof corsi.$inferSelect;
export type NewCorso = typeof corsi.$inferInsert;

export const iscrizioniAnni = pgTable(
  "iscrizioni_anni",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    iscrittoId: uuid("iscritto_id")
      .notNull()
      .references(() => iscritti.id, { onDelete: "cascade" }),
    dataIscrizione: date("data_iscrizione").notNull(),
    anni: text("anni").notNull(),
    corsoId: uuid("corso_id")
      .notNull()
      .references(() => corsi.id, { onDelete: "restrict" }),
    preferenzaInsegnanteId: uuid("preferenza_insegnante_id").references(() => insegnanti.id, { onDelete: "set null" }),
    libro: boolean("libro").notNull().default(false),
    quota: numeric("quota", { precision: 10, scale: 2 }).notNull().default("0"),
    classe: text("classe").notNull(),
    plesso: text("plesso").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("iscrizioni_anni_iscritto_anni_corso_uq").on(t.iscrittoId, t.anni, t.corsoId)],
);

export type IscrizioneAnno = typeof iscrizioniAnni.$inferSelect;
export type NewIscrizioneAnno = typeof iscrizioniAnni.$inferInsert;
