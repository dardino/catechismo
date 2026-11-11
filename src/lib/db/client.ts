import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import * as schema from "./schema";
import fs from "node:fs";
import path from "node:path";
import { readDbConfig } from "./config";

export type Db = ReturnType<typeof drizzlePg<typeof schema>>;

const globalForDb = globalThis as unknown as {
  db?: Db;
  dbPromise?: Promise<Db>;
  pglite?: PGlite;
  pool?: Pool;
  configKey?: string;
};

function configKeyOf(c: { mode: string; pgliteDataDir: string; databaseUrl: string }) {
  return `${c.mode}|${c.pgliteDataDir}|${c.databaseUrl}`;
}

async function createDb(): Promise<Db> {
  const config = readDbConfig();
  globalForDb.configKey = configKeyOf(config);

  if (config.mode === "pglite") {
    const dataDir = config.pgliteDataDir || ".data/pglite";
    const absDir = path.isAbsolute(dataDir) ? dataDir : path.join(process.cwd(), dataDir);
    fs.mkdirSync(absDir, { recursive: true });
    const pglite = globalForDb.pglite ?? new PGlite(absDir);
    globalForDb.pglite = pglite;
    const maybeReady = (pglite as PGlite & { waitReady?: Promise<void> }).waitReady;
    if (maybeReady) await maybeReady;
    return drizzlePglite(pglite, { schema }) as unknown as Db;
  }

  const connectionString = config.databaseUrl;
  if (!connectionString) {
    throw new Error("DATABASE_URL non configurato per la modalità Postgres");
  }
  const pool = globalForDb.pool ?? new Pool({ connectionString });
  globalForDb.pool = pool;
  return drizzlePg(pool, { schema });
}

export async function resetDb() {
  try {
    if (globalForDb.pool) await globalForDb.pool.end();
  } catch {}
  try {
    if (globalForDb.pglite && typeof globalForDb.pglite.close === "function") {
      await globalForDb.pglite.close();
    }
  } catch {}
  globalForDb.db = undefined;
  globalForDb.dbPromise = undefined;
  globalForDb.pglite = undefined;
  globalForDb.pool = undefined;
  globalForDb.configKey = undefined;
}

export async function getDb(): Promise<Db> {
  const currentKey = configKeyOf(readDbConfig());
  if (globalForDb.db && globalForDb.configKey === currentKey) return globalForDb.db;
  if (globalForDb.dbPromise && globalForDb.configKey === currentKey) return globalForDb.dbPromise;
  // config changed or not initialized
  await resetDb();
  globalForDb.configKey = currentKey;
  globalForDb.dbPromise = createDb().then((db) => {
    globalForDb.db = db;
    return db;
  });
  return globalForDb.dbPromise;
}
