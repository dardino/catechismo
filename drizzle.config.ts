import { defineConfig } from "drizzle-kit";
import fs from "node:fs";
import path from "node:path";

type Saved = { mode?: "pglite" | "postgres"; pgliteDataDir?: string; databaseUrl?: string };
let saved: Saved | null = null;
try {
  const p = path.join(process.cwd(), ".data", "db-config.json");
  if (fs.existsSync(p)) saved = JSON.parse(fs.readFileSync(p, "utf8"));
} catch {}

const mode =
  saved?.mode ||
  (process.env.DATABASE_URL && process.env.USE_PGLITE !== "true" ? "postgres" : "pglite");
const usePglite = mode === "pglite";
const pgliteDataDir = process.env.PGLITE_DATA_DIR || saved?.pgliteDataDir || ".data/pglite";
const databaseUrl = process.env.DATABASE_URL || saved?.databaseUrl || "";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  ...(usePglite
    ? {
        driver: "pglite",
        dbCredentials: {
          url: pgliteDataDir,
        },
      }
    : {
        dbCredentials: {
          url: databaseUrl,
        },
      }),
});
