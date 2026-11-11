"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { savePresenzeAction } from "@/app/actions/presenze";

type Corso = { id: string; nome: string };
type App = { id: string; data: string; ora: string };
type Row = { id: string; codiceNumerico: number; cognomeIscritto: string; nomeIscritto: string; presente: boolean };

function fmtDate(d: string) {
  const [y, m, day] = String(d).split("-");
  return y && m && day ? `${day}/${m}/${y}` : d;
}

export function PresenzeManager({
  corsi,
  anniOptions,
  selectedAnni,
  selectedCorsoId,
  appuntamenti,
  selectedId,
  rows,
}: {
  corsi: Corso[];
  anniOptions: string[];
  selectedAnni: string;
  selectedCorsoId: string;
  appuntamenti: App[];
  selectedId: string;
  rows: Row[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<Record<string, boolean>>(() => Object.fromEntries(rows.map((r) => [r.id, r.presente])));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setState(Object.fromEntries(rows.map((r) => [r.id, r.presente])));
  }, [rows, selectedId]);

  // Restore from session if URL missing, and persist selections
  useEffect(() => {
    const sa = sessionStorage.getItem("presenze.anni") || "";
    const sc = sessionStorage.getItem("presenze.corsoId") || "";
    if (!selectedAnni || !selectedCorsoId) {
      if (sa && sc) {
        router.replace(`/presenze?anni=${encodeURIComponent(sa)}&corsoId=${encodeURIComponent(sc)}`);
      }
      return;
    }
    sessionStorage.setItem("presenze.anni", selectedAnni);
    sessionStorage.setItem("presenze.corsoId", selectedCorsoId);
  }, [selectedAnni, selectedCorsoId, router]);

  function setFilters(anni: string, corsoId: string) {
    if (anni) sessionStorage.setItem("presenze.anni", anni);
    if (corsoId) sessionStorage.setItem("presenze.corsoId", corsoId);
    const p = new URLSearchParams();
    if (anni) p.set("anni", anni);
    if (corsoId) p.set("corsoId", corsoId);
    router.push(`/presenze${p.toString() ? `?${p}` : ""}`);
  }

  function setAppuntamento(id: string) {
    const p = new URLSearchParams();
    if (selectedAnni) p.set("anni", selectedAnni);
    if (selectedCorsoId) p.set("corsoId", selectedCorsoId);
    if (id) p.set("appuntamentoId", id);
    router.push(`/presenze?${p}`);
  }

  function clearFilters() {
    sessionStorage.removeItem("presenze.anni");
    sessionStorage.removeItem("presenze.corsoId");
    router.push("/presenze");
  }

  const reportHref = selectedAnni && selectedCorsoId ? `/presenze/report?anni=${encodeURIComponent(selectedAnni)}&corsoId=${encodeURIComponent(selectedCorsoId)}` : "/presenze/report";

  return (
    <div className="space-y-4">
      <div className="rounded border border-blue-100 bg-white p-4 space-y-3">
        <p className="text-sm text-blue-700">Seleziona prima <strong>anno</strong> e <strong>corso</strong> per inserire le presenze.</p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Anno *</label>
            <select value={selectedAnni} onChange={(e) => setFilters(e.target.value, selectedCorsoId)} className="rounded border px-3 py-2">
              <option value="">Seleziona...</option>
              {anniOptions.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Corso *</label>
            <select value={selectedCorsoId} onChange={(e) => setFilters(selectedAnni, e.target.value)} className="rounded border px-3 py-2">
              <option value="">Seleziona...</option>
              {corsi.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          {(selectedAnni || selectedCorsoId) ? (
            <button type="button" onClick={clearFilters} className="rounded border border-blue-200 px-3 py-2 text-sm text-blue-900 hover:bg-blue-50">Cancella filtri</button>
          ) : null}
        </div>
      </div>

      {selectedAnni && selectedCorsoId ? (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded border border-blue-100 bg-white p-4">
            <label className="text-sm font-medium">Appuntamento:</label>
            {appuntamenti.length === 0 ? (
              <span className="text-sm text-blue-700">Nessun appuntamento per questo anno/corso. <a href="/appuntamenti/nuovo" className="underline">Creane uno</a>.</span>
            ) : (
              <select value={selectedId} onChange={(e) => setAppuntamento(e.target.value)} className="rounded border px-3 py-2">
                {appuntamenti.map((a) => (
                  <option key={a.id} value={a.id}>{fmtDate(a.data)} {String(a.ora).slice(0,5)}</option>
                ))}
              </select>
            )}
            <button
              disabled={pending || !selectedId || appuntamenti.length === 0}
              className="rounded bg-blue-900 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-50"
              onClick={() => startTransition(async () => {
                const presentiIds = Object.entries(state).filter(([, v]) => v).map(([k]) => k);
                await savePresenzeAction(selectedId, presentiIds);
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
              })}
            >
              {pending ? "Salvataggio..." : "Salva presenze"}
            </button>
            <a href={reportHref} className="rounded border border-blue-200 px-4 py-2 text-blue-900 hover:bg-blue-50">Report presenze</a>
            {saved ? <span className="text-sm text-green-700">Salvato.</span> : null}
          </div>

          <div className="overflow-x-auto rounded border border-blue-100 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-blue-100 text-left text-blue-950"><tr><th className="px-3 py-2">Codice</th><th className="px-3 py-2">Cognome e nome</th><th className="px-3 py-2">Presenza</th></tr></thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={3} className="px-3 py-6 text-center text-blue-700">Nessun iscritto per questo anno/corso (verifica le iscrizioni).</td></tr>
                ) : rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">{r.codiceNumerico}</td>
                    <td className="px-3 py-2">{r.cognomeIscritto} {r.nomeIscritto}</td>
                    <td className="px-3 py-2"><input type="checkbox" checked={!!state[r.id]} onChange={(e) => setState((s) => ({ ...s, [r.id]: e.target.checked }))} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
