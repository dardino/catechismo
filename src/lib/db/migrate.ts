import { sql } from "drizzle-orm";
import type { Db } from "./client";

function getAnnoScolasticoCorrente(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const start = m >= 9 ? y : y - 1;
  return `${start}-${start + 1}`;
}

export async function runPreMigrations(db: Db) {
  // Ensure corsi table exists and has default rows (needed before backfilling appuntamenti.corso_id)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS corsi (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      nome text NOT NULL,
      ordine integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT corsi_nome_unique UNIQUE (nome)
    )
  `);
  // Align constraint name if table existed with default name
  await db.execute(sql`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'corsi_nome_key' AND conrelid = 'corsi'::regclass)
         AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'corsi_nome_unique' AND conrelid = 'corsi'::regclass) THEN
        ALTER TABLE corsi RENAME CONSTRAINT corsi_nome_key TO corsi_nome_unique;
      END IF;
    END $$;
  `);
  const corsiCount = await db.execute(sql`SELECT count(*)::int AS c FROM corsi`);
  const cRow = (corsiCount as unknown as { rows?: { c: number }[] }).rows?.[0] ?? (corsiCount as unknown as { c: number }[])[0];
  const count = Number(cRow?.c ?? 0);
  if (count === 0) {
    const defaults = [
      "1. Con Te Figli (II elementare)",
      "2. Con Te Discepoli (III elementare)",
      "3. Con Te Amici (Anno di comunione)",
      "4. Con Te Cristiani (Anno di cresima)",
    ];
    for (let i = 0; i < defaults.length; i++) {
      await db.execute(sql`INSERT INTO corsi (nome, ordine) VALUES (${defaults[i]}, ${i + 1}) ON CONFLICT (nome) DO NOTHING`);
    }
  }

  // Backfill appuntamenti: add anni/corso_id if missing, fill with current anno and first corso, then enforce NOT NULL
  const hasApp = await db.execute(sql`
    SELECT 1 AS ok
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'appuntamenti'
    LIMIT 1
  `);
  const hasAppRow = (hasApp as unknown as { rows?: unknown[] }).rows ?? (hasApp as unknown as unknown[]);
  if ((hasAppRow as unknown[]).length > 0) {
    const colInfo = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'appuntamenti' AND column_name IN ('anni', 'corso_id')
    `);
    const cols = ((colInfo as unknown as { rows?: { column_name: string }[] }).rows ?? (colInfo as unknown as { column_name: string }[])).map((r) => r.column_name);
    const hasAnni = cols.includes("anni");
    const hasCorsoId = cols.includes("corso_id");

    if (!hasAnni) {
      await db.execute(sql`ALTER TABLE appuntamenti ADD COLUMN anni text`);
    }
    if (!hasCorsoId) {
      await db.execute(sql`ALTER TABLE appuntamenti ADD COLUMN corso_id uuid`);
    }

    if (!hasAnni || !hasCorsoId) {
      const annoCorrente = getAnnoScolasticoCorrente();
      const firstCorso = await db.execute(sql`SELECT id FROM corsi ORDER BY ordine ASC, nome ASC LIMIT 1`);
      const first = ((firstCorso as unknown as { rows?: { id: string }[] }).rows ?? (firstCorso as unknown as { id: string }[]))[0];
      if (first?.id) {
        await db.execute(sql`UPDATE appuntamenti SET anni = ${annoCorrente} WHERE anni IS NULL OR anni = ''`);
        await db.execute(sql`UPDATE appuntamenti SET corso_id = ${first.id}::uuid WHERE corso_id IS NULL`);
      }
      // set NOT NULL (safe after backfill)
      await db.execute(sql`ALTER TABLE appuntamenti ALTER COLUMN anni SET NOT NULL`);
      await db.execute(sql`ALTER TABLE appuntamenti ALTER COLUMN corso_id SET NOT NULL`);
      // add FK if missing
      await db.execute(sql`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'appuntamenti_corso_id_fkey'
          ) THEN
            ALTER TABLE appuntamenti
              ADD CONSTRAINT appuntamenti_corso_id_fkey
              FOREIGN KEY (corso_id) REFERENCES corsi(id) ON DELETE RESTRICT;
          END IF;
        END $$;
      `);
    }
  }

  // Backfill classi: add anni/corso_id if missing, fill with current anno and first corso, then enforce NOT NULL
  const hasClassi = await db.execute(sql`
    SELECT 1 AS ok
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'classi'
    LIMIT 1
  `);
  const hasClassiRow = (hasClassi as unknown as { rows?: unknown[] }).rows ?? (hasClassi as unknown as unknown[]);
  if ((hasClassiRow as unknown[]).length > 0) {
    const colInfo = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'classi' AND column_name IN ('anni', 'corso_id')
    `);
    const cols = ((colInfo as unknown as { rows?: { column_name: string }[] }).rows ?? (colInfo as unknown as { column_name: string }[])).map((r) => r.column_name);
    const hasAnni = cols.includes("anni");
    const hasCorsoId = cols.includes("corso_id");

    if (!hasAnni) {
      await db.execute(sql`ALTER TABLE classi ADD COLUMN anni text`);
    }
    if (!hasCorsoId) {
      await db.execute(sql`ALTER TABLE classi ADD COLUMN corso_id uuid`);
    }

    if (!hasAnni || !hasCorsoId) {
      const annoCorrente = getAnnoScolasticoCorrente();
      const firstCorso = await db.execute(sql`SELECT id FROM corsi ORDER BY ordine ASC, nome ASC LIMIT 1`);
      const first = ((firstCorso as unknown as { rows?: { id: string }[] }).rows ?? (firstCorso as unknown as { id: string }[]))[0];
      if (first?.id) {
        await db.execute(sql`UPDATE classi SET anni = ${annoCorrente} WHERE anni IS NULL OR anni = ''`);
        await db.execute(sql`UPDATE classi SET corso_id = ${first.id}::uuid WHERE corso_id IS NULL`);
      }
      await db.execute(sql`ALTER TABLE classi ALTER COLUMN anni SET NOT NULL`);
      await db.execute(sql`ALTER TABLE classi ALTER COLUMN corso_id SET NOT NULL`);
      await db.execute(sql`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'classi_corso_id_fkey') THEN
            ALTER TABLE classi ADD CONSTRAINT classi_corso_id_fkey FOREIGN KEY (corso_id) REFERENCES corsi(id) ON DELETE RESTRICT;
          END IF;
        END $$;
      `);
    }
    // replace old unique constraint with new one (includes anni/corso)
    await db.execute(sql`ALTER TABLE classi DROP CONSTRAINT IF EXISTS classi_iscritto_insegnante_uq`);
    await db.execute(sql`DROP INDEX IF EXISTS classi_iscritto_insegnante_uq`);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS classi_iscritto_insegnante_anni_corso_uq ON classi(iscritto_id, insegnante_id, anni, corso_id)`);
  }

  // Add preferenza_insegnante_id to iscrizioni_anni if missing
  const hasIscrizioni = await db.execute(sql`
    SELECT 1 AS ok FROM information_schema.tables WHERE table_schema='public' AND table_name='iscrizioni_anni' LIMIT 1
  `);
  const hasIscrizioniRow = (hasIscrizioni as unknown as { rows?: unknown[] }).rows ?? (hasIscrizioni as unknown as unknown[]);
  if ((hasIscrizioniRow as unknown[]).length > 0) {
    await db.execute(sql`ALTER TABLE iscrizioni_anni ADD COLUMN IF NOT EXISTS preferenza_insegnante_id uuid`);
    await db.execute(sql`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'iscrizioni_anni_preferenza_insegnante_id_fkey') THEN
          ALTER TABLE iscrizioni_anni ADD CONSTRAINT iscrizioni_anni_preferenza_insegnante_id_fkey
            FOREIGN KEY (preferenza_insegnante_id) REFERENCES insegnanti(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }
}