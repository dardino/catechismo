"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importIscrittiFromCsvAction } from "@/app/actions/iscritti";

export function ImportIscrittiCsv() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<{ imported: number; updated: number; errors: string[] } | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function onClose() {
    setOpen(false);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await importIscrittiFromCsvAction(fd);
      setResult(res);
      if (res.imported > 0 || res.updated > 0) router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-50"
      >
        Importa da CSV
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-lg bg-white p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Importa anagrafica da CSV</h2>
              <button type="button" onClick={onClose} className="text-blue-900" aria-label="Chiudi">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <p className="mb-3 text-sm text-blue-800">
              Usa il formato esportato (separatore <code>;</code>, intestazioni incluse). Le righe con{" "}
              <code>codiceNumerico</code> esistente vengono aggiornate, altrimenti vengono create.
            </p>
            <form onSubmit={onSubmit} className="space-y-3">
              <input ref={fileRef} type="file" name="file" accept=".csv,text/csv" required className="block w-full text-sm" />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  {pending ? "Importazione..." : "Importa"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded border border-blue-200 px-4 py-2 text-sm text-blue-900 hover:bg-blue-50"
                >
                  Chiudi
                </button>
              </div>
            </form>

            {result ? (
              <div className="mt-4 rounded border border-blue-100 bg-blue-50 p-3 text-sm">
                <p>
                  <strong>Creati:</strong> {result.imported}
                </p>
                <p>
                  <strong>Aggiornati:</strong> {result.updated}
                </p>
                {result.errors.length > 0 ? (
                  <div className="mt-2">
                    <p className="font-medium text-red-700">Errori ({result.errors.length}):</p>
                    <ul className="mt-1 max-h-40 list-disc overflow-auto pl-5 text-red-700">
                      {result.errors.slice(0, 50).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                      {result.errors.length > 50 ? <li>...e altri {result.errors.length - 50}</li> : null}
                    </ul>
                  </div>
                ) : (
                  <p className="mt-2 text-green-700">Importazione completata senza errori.</p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
