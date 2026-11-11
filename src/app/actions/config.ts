"use server";

import { requireAdmin } from "@/lib/auth/session";
import { getDb, resetDb } from "@/lib/db/client";
import { readDbConfig, writeDbConfig, type DbConfig } from "@/lib/db/config";
import { runPreMigrations } from "@/lib/db/migrate";
import { sql } from "drizzle-orm";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export async function getDbConfigAction(): Promise<DbConfig> {
  await requireAdmin();
  return readDbConfig();
}

export async function saveDbConfigAction(
  _prev: { ok?: boolean; error?: string } | undefined,
  formData: FormData,
) {
  await requireAdmin();
  const mode = formData.get("mode") === "postgres" ? "postgres" : "pglite";
  const pgliteDataDir = String(formData.get("pgliteDataDir") || ".data/pglite").trim() || ".data/pglite";
  const databaseUrl = String(formData.get("databaseUrl") || "").trim();
  if (mode === "postgres" && !databaseUrl) {
    return { error: "Per la modalità Postgres è richiesto il Database URL." };
  }
  const config: DbConfig = { mode, pgliteDataDir, databaseUrl };
  writeDbConfig(config);
  await resetDb();
  return { ok: true };
}

export async function testDbConnectionAction() {
  await requireAdmin();
  try {
    await resetDb();
    const db = await getDb();
    // simple query works for both pg and pglite via drizzle
    await db.execute(sql`select 1 as ok`);
    return { ok: true, message: "Connessione riuscita." };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, message: `Connessione fallita: ${message}` };
  }
}

export async function initDbAction() {
  await requireAdmin();
  const config = readDbConfig();
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (config.mode === "pglite") {
    env.USE_PGLITE = "true";
    env.PGLITE_DATA_DIR = config.pgliteDataDir || ".data/pglite";
    delete env.DATABASE_URL;
  } else {
    env.USE_PGLITE = "false";
    env.DATABASE_URL = config.databaseUrl || "";
  }
  try {
    await resetDb();
    // Pre-migrazioni sicure (backfill senza perdita dati, es. appuntamenti.anni/corso_id)
    const db = await getDb();
    await runPreMigrations(db);
    await resetDb();
    // Use drizzle-kit push to sync schema (init/aggiornamento)
    const cmd = "pnpm db:push";
    const { stdout, stderr } = await execAsync(cmd, {
      cwd: process.cwd(),
      env,
      shell: process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "/bin/sh",
      windowsHide: true,
      timeout: 120000,
      maxBuffer: 1024 * 1024,
    });
    await resetDb();
    const out = `${stdout || ""}\n${stderr || ""}`.trim();
    return { ok: true, message: out || "Schema applicato/aggiornato con successo." };
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; message?: string };
    const stdout = err?.stdout || "";
    const stderr = err?.stderr || "";
    const msg = err?.message || String(e);
    const detail = `${msg}\n${stdout}\n${stderr}`.trim();
    return { ok: false, message: `Inizializzazione/aggiornamento fallito:\n${detail}` };
  }
}
