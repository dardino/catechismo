"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Corso = { id: string; nome: string };

export function AppuntamentiFilters({
  corsi,
  anniOptions,
  selectedAnni,
  selectedCorsoId,
}: {
  corsi: Corso[];
  anniOptions: string[];
  selectedAnni: string;
  selectedCorsoId: string;
}) {
  const router = useRouter();
  const [anni, setAnni] = useState(selectedAnni);
  const [corsoId, setCorsoId] = useState(selectedCorsoId);

  useEffect(() => {
    setAnni(selectedAnni);
    setCorsoId(selectedCorsoId);
  }, [selectedAnni, selectedCorsoId]);

  useEffect(() => {
    const sa = sessionStorage.getItem("appuntamenti.anni") || "";
    const sc = sessionStorage.getItem("appuntamenti.corsoId") || "";
    if (!selectedAnni && !selectedCorsoId && (sa || sc)) {
      const p = new URLSearchParams();
      if (sa) p.set("anni", sa);
      if (sc) p.set("corsoId", sc);
      router.replace(`/appuntamenti?${p}`);
      return;
    }
    if (selectedAnni) sessionStorage.setItem("appuntamenti.anni", selectedAnni);
    else sessionStorage.removeItem("appuntamenti.anni");
    if (selectedCorsoId) sessionStorage.setItem("appuntamenti.corsoId", selectedCorsoId);
    else sessionStorage.removeItem("appuntamenti.corsoId");
  }, [selectedAnni, selectedCorsoId, router]);

  function apply() {
    const p = new URLSearchParams();
    if (anni) p.set("anni", anni);
    if (corsoId) p.set("corsoId", corsoId);
    router.push(`/appuntamenti${p.toString() ? `?${p}` : ""}`);
  }

  function clear() {
    sessionStorage.removeItem("appuntamenti.anni");
    sessionStorage.removeItem("appuntamenti.corsoId");
    setAnni("");
    setCorsoId("");
    router.push("/appuntamenti");
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded border border-blue-100 bg-white p-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Anno</label>
        <select value={anni} onChange={(e) => setAnni(e.target.value)} className="rounded border px-3 py-2">
          <option value="">Tutti</option>
          {anniOptions.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Corso</label>
        <select value={corsoId} onChange={(e) => setCorsoId(e.target.value)} className="rounded border px-3 py-2">
          <option value="">Tutti</option>
          {corsi.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </div>
      <button type="button" onClick={apply} className="rounded bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">
        Applica
      </button>
      {(selectedAnni || selectedCorsoId) ? (
        <button type="button" onClick={clear} className="rounded border border-blue-200 px-3 py-2 text-sm text-blue-900 hover:bg-blue-50">
          Cancella filtri
        </button>
      ) : null}
    </div>
  );
}
