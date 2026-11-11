import fs from "node:fs";
import path from "node:path";

export type DbMode = "pglite" | "postgres";

export type DbConfig = {
  mode: DbMode;
  pgliteDataDir: string;
  databaseUrl: string;
};

const CONFIG_PATH = path.join(process.cwd(), ".data", "db-config.json");

export function getDefaultDbConfig(): DbConfig {
  const envMode: DbMode = process.env.DATABASE_URL && process.env.USE_PGLITE !== "true" ? "postgres" : "pglite";
  return {
    mode: envMode,
    pgliteDataDir: process.env.PGLITE_DATA_DIR || ".data/pglite",
    databaseUrl: process.env.DATABASE_URL || "",
  };
}

export function readDbConfig(): DbConfig {
  const defaults = getDefaultDbConfig();
  try {
    if (!fs.existsSync(CONFIG_PATH)) return defaults;
    const raw = fs.readFileSync(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<DbConfig>;
    return {
      mode: parsed.mode === "postgres" ? "postgres" : "pglite",
      pgliteDataDir: typeof parsed.pgliteDataDir === "string" && parsed.pgliteDataDir.trim() ? parsed.pgliteDataDir : defaults.pgliteDataDir,
      databaseUrl: typeof parsed.databaseUrl === "string" ? parsed.databaseUrl : defaults.databaseUrl,
    };
  } catch {
    return defaults;
  }
}

export function writeDbConfig(config: DbConfig) {
  const dir = path.dirname(CONFIG_PATH);
  fs.mkdirSync(dir, { recursive: true });
  const toSave: DbConfig = {
    mode: config.mode === "postgres" ? "postgres" : "pglite",
    pgliteDataDir: config.pgliteDataDir?.trim() || ".data/pglite",
    databaseUrl: config.databaseUrl?.trim() || "",
  };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(toSave, null, 2), "utf8");
}

export function getDbConfigPath() {
  return CONFIG_PATH;
}
