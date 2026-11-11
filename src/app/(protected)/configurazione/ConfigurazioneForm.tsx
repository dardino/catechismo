"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState, useTransition } from "react";
import { saveDbConfigAction, testDbConnectionAction, initDbAction } from "@/app/actions/config";
import type { DbConfig } from "@/lib/db/config";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-blue-900 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-50"
    >
      {pending ? "Salvataggio..." : "Salva configurazione"}
    </button>
  );
}

export function ConfigurazioneForm({ initialConfig }: { initialConfig: DbConfig }) {
  const [saveState, saveAction] = useFormState(saveDbConfigAction, undefined);
  const [mode, setMode] = useState<DbConfig["mode"]>(initialConfig.mode);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const input = "w-full rounded border px-3 py-2";
  const label = "mb-1 block text-sm font-medium";

  return (
    <div className="space-y-4">
      <form action={saveAction} className="space-y-4 rounded border border-blue-100 bg-white p-4">
        <h2 className="font-semibold">Connessione database</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={label}>Modalità</label>
            <select name="mode" value={mode} onChange={(e) => setMode(e.target.value as DbConfig["mode"])} className={input}>
              <option value="pglite">PGlite (locale, file su disco)</option>
              <option value="postgres">Postgres (DATABASE_URL)</option>
            </select>
          </div>
          {mode === "pglite" ? (
            <div className="sm:col-span-2">
              <label className={label}>Cartella dati PGlite</label>
              <input name="pgliteDataDir" defaultValue={initialConfig.pgliteDataDir} className={input} placeholder=".data/pglite" />
              <p className="mt-1 text-xs text-blue-700">Percorso relativo alla cartella del progetto o assoluto.</p>
            </div>
          ) : (
            <div className="sm:col-span-2">
              <label className={label}>Database URL (Postgres)</label>
              <input name="databaseUrl" defaultValue={initialConfig.databaseUrl} className={input} placeholder="postgres://user:password@host:5432/dbname" />
            </div>
          )}
          {mode === "postgres" ? (
            <input type="hidden" name="pgliteDataDir" value={initialConfig.pgliteDataDir || ".data/pglite"} />
          ) : (
            <input type="hidden" name="databaseUrl" value={initialConfig.databaseUrl || ""} />
          )}
        </div>
        {saveState?.error ? <p className="text-sm text-red-600">{saveState.error}</p> : null}
        {saveState?.ok ? <p className="text-sm text-green-700">Configurazione salvata.</p> : null}
        <SaveButton />
      </form>

      <section className="space-y-3 rounded border border-blue-100 bg-white p-4">
        <h2 className="font-semibold">Strumenti database</h2>
        <p className="text-sm text-blue-700">
          Salva la configurazione prima di testare o inizializzare. &quot;Inizializza / Aggiorna schema&quot; esegue <code>drizzle-kit push</code> (crea/aggiorna tabelle in base allo schema).
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            className="rounded border border-blue-200 bg-white px-4 py-2 text-blue-900 hover:bg-blue-50 disabled:opacity-50"
            onClick={() =>
              startTransition(async () => {
                setResult(null);
                const res = await testDbConnectionAction();
                setResult(res);
              })
            }
          >
            {pending ? "Esecuzione..." : "Testa connessione"}
          </button>
          <button
            type="button"
            disabled={pending}
            className="rounded bg-blue-900 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-50"
            onClick={() =>
              startTransition(async () => {
                if (!confirm("Eseguire inizializzazione/aggiornamento dello schema sul database configurato?")) return;
                setResult(null);
                const res = await initDbAction();
                setResult(res);
              })
            }
          >
            {pending ? "Esecuzione..." : "Inizializza / Aggiorna schema"}
          </button>
        </div>
        {result ? (
          <pre
            className={`whitespace-pre-wrap rounded border p-3 text-sm ${result.ok ? "border-green-200 bg-green-50 text-green-900" : "border-red-200 bg-red-50 text-red-900"}`}
          >
            {result.message}
          </pre>
        ) : null}
      </section>
    </div>
  );
}
