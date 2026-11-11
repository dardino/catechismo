import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function readConfig() {
  const cfgPath = path.join(process.cwd(), ".data", "db-config.json");
  try {
    if (fs.existsSync(cfgPath)) {
      const raw = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
      if (raw && (raw.mode === "postgres" || raw.mode === "pglite")) {
        return {
          mode: raw.mode,
          pgliteDataDir: raw.pgliteDataDir || ".data/pglite",
          databaseUrl: raw.databaseUrl || "",
        };
      }
    }
  } catch {}
  const usePglite = (process.env.USE_PGLITE || "true").toLowerCase() !== "false";
  return {
    mode: usePglite ? "pglite" : "postgres",
    pgliteDataDir: process.env.PGLITE_DATA_DIR || ".data/pglite",
    databaseUrl: process.env.DATABASE_URL || "",
  };
}

function annoCorrente() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  const start = m >= 9 ? y : y - 1;
  return `${start}-${start + 1}`;
}

async function preMigratePostgres(databaseUrl) {
  const { Client } = await import("pg");
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS corsi (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        nome text NOT NULL,
        ordine integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT corsi_nome_unique UNIQUE (nome)
      )`);
    await client.query(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'corsi_nome_key' AND conrelid = 'corsi'::regclass)
         AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'corsi_nome_unique' AND conrelid = 'corsi'::regclass) THEN
        ALTER TABLE corsi RENAME CONSTRAINT corsi_nome_key TO corsi_nome_unique;
      END IF;
    END $$;`);
    const { rows: cnt } = await client.query("SELECT count(*)::int AS c FROM corsi");
    if ((cnt[0]?.c ?? 0) === 0) {
      const defaults = [
        "1. Con Te Figli (II elementare)",
        "2. Con Te Discepoli (III elementare)",
        "3. Con Te Amici (Anno di comunione)",
        "4. Con Te Cristiani (Anno di cresima)",
      ];
      for (let i = 0; i < defaults.length; i++) {
        await client.query("INSERT INTO corsi (nome, ordine) VALUES ($1,$2) ON CONFLICT (nome) DO NOTHING", [defaults[i], i + 1]);
      }
    }
    const { rows: hasApp } = await client.query("SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='appuntamenti' LIMIT 1");
    if (hasApp.length) {
      const { rows: colRows } = await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='appuntamenti' AND column_name IN ('anni','corso_id')");
      const cols = colRows.map((r) => r.column_name);
      const hasAnni = cols.includes("anni");
      const hasCorsoId = cols.includes("corso_id");
      if (!hasAnni) await client.query("ALTER TABLE appuntamenti ADD COLUMN anni text");
      if (!hasCorsoId) await client.query("ALTER TABLE appuntamenti ADD COLUMN corso_id uuid");
      if (!hasAnni || !hasCorsoId) {
        const { rows: fc } = await client.query("SELECT id FROM corsi ORDER BY ordine ASC, nome ASC LIMIT 1");
        if (fc[0]?.id) {
          await client.query("UPDATE appuntamenti SET anni = $1 WHERE anni IS NULL OR anni = ''", [annoCorrente()]);
          await client.query("UPDATE appuntamenti SET corso_id = $1::uuid WHERE corso_id IS NULL", [fc[0].id]);
        }
        await client.query("ALTER TABLE appuntamenti ALTER COLUMN anni SET NOT NULL");
        await client.query("ALTER TABLE appuntamenti ALTER COLUMN corso_id SET NOT NULL");
        await client.query(`DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appuntamenti_corso_id_fkey') THEN
            ALTER TABLE appuntamenti ADD CONSTRAINT appuntamenti_corso_id_fkey FOREIGN KEY (corso_id) REFERENCES corsi(id) ON DELETE RESTRICT;
          END IF;
        END $$;`);
      }
    }

    const { rows: hasClassi } = await client.query("SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='classi' LIMIT 1");
    if (hasClassi.length) {
      const { rows: colRows } = await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='classi' AND column_name IN ('anni','corso_id')");
      const cols = colRows.map((r) => r.column_name);
      const hasAnni = cols.includes("anni");
      const hasCorsoId = cols.includes("corso_id");
      if (!hasAnni) await client.query("ALTER TABLE classi ADD COLUMN anni text");
      if (!hasCorsoId) await client.query("ALTER TABLE classi ADD COLUMN corso_id uuid");
      if (!hasAnni || !hasCorsoId) {
        const { rows: fc } = await client.query("SELECT id FROM corsi ORDER BY ordine ASC, nome ASC LIMIT 1");
        if (fc[0]?.id) {
          await client.query("UPDATE classi SET anni = $1 WHERE anni IS NULL OR anni = ''", [annoCorrente()]);
          await client.query("UPDATE classi SET corso_id = $1::uuid WHERE corso_id IS NULL", [fc[0].id]);
        }
        await client.query("ALTER TABLE classi ALTER COLUMN anni SET NOT NULL");
        await client.query("ALTER TABLE classi ALTER COLUMN corso_id SET NOT NULL");
        await client.query(`DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'classi_corso_id_fkey') THEN
            ALTER TABLE classi ADD CONSTRAINT classi_corso_id_fkey FOREIGN KEY (corso_id) REFERENCES corsi(id) ON DELETE RESTRICT;
          END IF;
        END $$;`);
      }
      await client.query("ALTER TABLE classi DROP CONSTRAINT IF EXISTS classi_iscritto_insegnante_uq");
      await client.query("DROP INDEX IF EXISTS classi_iscritto_insegnante_uq");
      await client.query("CREATE UNIQUE INDEX IF NOT EXISTS classi_iscritto_insegnante_anni_corso_uq ON classi(iscritto_id, insegnante_id, anni, corso_id)");
    }

    const { rows: hasIscrizioni } = await client.query("SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='iscrizioni_anni' LIMIT 1");
    if (hasIscrizioni.length) {
      await client.query("ALTER TABLE iscrizioni_anni ADD COLUMN IF NOT EXISTS preferenza_insegnante_id uuid");
      await client.query(`DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'iscrizioni_anni_preferenza_insegnante_id_fkey') THEN
          ALTER TABLE iscrizioni_anni ADD CONSTRAINT iscrizioni_anni_preferenza_insegnante_id_fkey FOREIGN KEY (preferenza_insegnante_id) REFERENCES insegnanti(id) ON DELETE SET NULL;
        END IF;
      END $$;`);
    }
  } finally {
    await client.end();
  }
}

async function preMigratePglite(dataDir) {
  const { PGlite } = await import("@electric-sql/pglite");
  const absDir = path.isAbsolute(dataDir) ? dataDir : path.join(process.cwd(), dataDir);
  fs.mkdirSync(absDir, { recursive: true });
  const db = new PGlite(absDir);
  if (db.waitReady) await db.waitReady;
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS corsi (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        nome text NOT NULL,
        ordine integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT corsi_nome_unique UNIQUE (nome)
      )`);
    await db.exec(`DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'corsi_nome_key' AND conrelid = 'corsi'::regclass)
         AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'corsi_nome_unique' AND conrelid = 'corsi'::regclass) THEN
        ALTER TABLE corsi RENAME CONSTRAINT corsi_nome_key TO corsi_nome_unique;
      END IF;
    END $$;`);
    const cnt = await db.query("SELECT count(*)::int AS c FROM corsi");
    if ((cnt.rows[0]?.c ?? 0) === 0) {
      const defaults = [
        "1. Con Te Figli (II elementare)",
        "2. Con Te Discepoli (III elementare)",
        "3. Con Te Amici (Anno di comunione)",
        "4. Con Te Cristiani (Anno di cresima)",
      ];
      for (let i = 0; i < defaults.length; i++) {
        await db.query("INSERT INTO corsi (nome, ordine) VALUES ($1,$2) ON CONFLICT (nome) DO NOTHING", [defaults[i], i + 1]);
      }
    }
    const hasApp = await db.query("SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='appuntamenti' LIMIT 1");
    if (hasApp.rows.length) {
      const colRows = await db.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='appuntamenti' AND column_name IN ('anni','corso_id')");
      const cols = colRows.rows.map((r) => r.column_name);
      const hasAnni = cols.includes("anni");
      const hasCorsoId = cols.includes("corso_id");
      if (!hasAnni) await db.exec("ALTER TABLE appuntamenti ADD COLUMN anni text");
      if (!hasCorsoId) await db.exec("ALTER TABLE appuntamenti ADD COLUMN corso_id uuid");
      if (!hasAnni || !hasCorsoId) {
        const fc = await db.query("SELECT id FROM corsi ORDER BY ordine ASC, nome ASC LIMIT 1");
        if (fc.rows[0]?.id) {
          await db.query("UPDATE appuntamenti SET anni = $1 WHERE anni IS NULL OR anni = ''", [annoCorrente()]);
          await db.query("UPDATE appuntamenti SET corso_id = $1::uuid WHERE corso_id IS NULL", [fc.rows[0].id]);
        }
        await db.exec("ALTER TABLE appuntamenti ALTER COLUMN anni SET NOT NULL");
        await db.exec("ALTER TABLE appuntamenti ALTER COLUMN corso_id SET NOT NULL");
        await db.exec(`DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appuntamenti_corso_id_fkey') THEN
            ALTER TABLE appuntamenti ADD CONSTRAINT appuntamenti_corso_id_fkey FOREIGN KEY (corso_id) REFERENCES corsi(id) ON DELETE RESTRICT;
          END IF;
        END $$;`);
      }
    }

    const hasClassi = await db.query("SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='classi' LIMIT 1");
    if (hasClassi.rows.length) {
      const colRows = await db.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='classi' AND column_name IN ('anni','corso_id')");
      const cols = colRows.rows.map((r) => r.column_name);
      const hasAnni = cols.includes("anni");
      const hasCorsoId = cols.includes("corso_id");
      if (!hasAnni) await db.exec("ALTER TABLE classi ADD COLUMN anni text");
      if (!hasCorsoId) await db.exec("ALTER TABLE classi ADD COLUMN corso_id uuid");
      if (!hasAnni || !hasCorsoId) {
        const fc = await db.query("SELECT id FROM corsi ORDER BY ordine ASC, nome ASC LIMIT 1");
        if (fc.rows[0]?.id) {
          await db.query("UPDATE classi SET anni = $1 WHERE anni IS NULL OR anni = ''", [annoCorrente()]);
          await db.query("UPDATE classi SET corso_id = $1::uuid WHERE corso_id IS NULL", [fc.rows[0].id]);
        }
        await db.exec("ALTER TABLE classi ALTER COLUMN anni SET NOT NULL");
        await db.exec("ALTER TABLE classi ALTER COLUMN corso_id SET NOT NULL");
        await db.exec(`DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'classi_corso_id_fkey') THEN
            ALTER TABLE classi ADD CONSTRAINT classi_corso_id_fkey FOREIGN KEY (corso_id) REFERENCES corsi(id) ON DELETE RESTRICT;
          END IF;
        END $$;`);
      }
      await db.exec("ALTER TABLE classi DROP CONSTRAINT IF EXISTS classi_iscritto_insegnante_uq");
      await db.exec("DROP INDEX IF EXISTS classi_iscritto_insegnante_uq");
      await db.exec("CREATE UNIQUE INDEX IF NOT EXISTS classi_iscritto_insegnante_anni_corso_uq ON classi(iscritto_id, insegnante_id, anni, corso_id)");
    }

    const hasIscrizioni = await db.query("SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='iscrizioni_anni' LIMIT 1");
    if (hasIscrizioni.rows.length) {
      await db.exec("ALTER TABLE iscrizioni_anni ADD COLUMN IF NOT EXISTS preferenza_insegnante_id uuid");
      await db.exec(`DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'iscrizioni_anni_preferenza_insegnante_id_fkey') THEN
          ALTER TABLE iscrizioni_anni ADD CONSTRAINT iscrizioni_anni_preferenza_insegnante_id_fkey FOREIGN KEY (preferenza_insegnante_id) REFERENCES insegnanti(id) ON DELETE SET NULL;
        END IF;
      END $$;`);
    }
  } finally {
    await db.close();
  }
}

try {
  const config = readConfig();
  console.log(`[db:push] modalità: ${config.mode}`);
  const env = { ...process.env };
  if (config.mode === "pglite") {
    env.USE_PGLITE = "true";
    env.PGLITE_DATA_DIR = config.pgliteDataDir || ".data/pglite";
    delete env.DATABASE_URL;
    await preMigratePglite(env.PGLITE_DATA_DIR);
  } else {
    if (!config.databaseUrl) {
      console.error("DATABASE_URL non configurato per la modalità Postgres");
      process.exit(1);
    }
    env.USE_PGLITE = "false";
    env.DATABASE_URL = config.databaseUrl;
    await preMigratePostgres(config.databaseUrl);
  }
  console.log("[db:push] pre-migrazione completata, eseguo drizzle-kit push...");

  const r = spawnSync(process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["exec", "drizzle-kit", "push"], {
    stdio: "inherit",
    env,
    cwd: process.cwd(),
    shell: process.platform === "win32",
  });
  if (r.error) throw r.error;
  process.exit(r.status ?? 1);
} catch (e) {
  console.error(e instanceof Error ? e.message : String(e));
  if (e && typeof e === "object" && "stack" in e) console.error(e.stack);
  process.exit(1);
}