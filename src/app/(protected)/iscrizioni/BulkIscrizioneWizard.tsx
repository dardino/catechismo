"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bulkCreateIscrizioniAction, getBulkIscrizioneWizardData } from "@/app/actions/iscrizioni";

type Corso = { id: string; nome: string; ordine?: number };
type Iscritto = { id: string; codiceNumerico: number; cognomeIscritto: string; nomeIscritto: string; classeScolastica: string; plessoScolastico: string; nascosto: boolean };
type IscrRow = { iscrittoId: string; anni: string; corsoId: string; dataIscrizione: string; preferenzaInsegnanteId: string | null; createdAt?: string | Date };

type WizardData = {
  iscritti: Iscritto[];
  iscrizioni: IscrRow[];
  corsi: Corso[];
  anniOptions: string[];
  annoCorrente: string;
};

export function BulkIscrizioneWizard() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<WizardData | null>(null);
  const [step, setStep] = useState(1);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // step 1 filters & selection
  const [nome, setNome] = useState("");
  const [fCorsoId, setFCorsoId] = useState("");
  const [fAnni, setFAnni] = useState("");
  const [maiIscritti, setMaiIscritti] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // step 2
  const [targetAnni, setTargetAnni] = useState("");
  const [targetCorsoId, setTargetCorsoId] = useState("");

  // step 3
  const [libro, setLibro] = useState(false);
  const [quota, setQuota] = useState("0,00");

  async function openWizard() {
    setOpen(true);
    setStep(1);
    setResult(null);
    setSubmitError(null);
    setNome(""); setFCorsoId(""); setFAnni(""); setMaiIscritti(false);
    setSelected(new Set());
    setLibro(false); setQuota("0,00");
    setLoading(true);
    try {
      const d = await getBulkIscrizioneWizardData();
      setData(d as WizardData);
      setTargetAnni(d.annoCorrente || "");
      setTargetCorsoId("");
    } finally {
      setLoading(false);
    }
  }

  function close() {
    setOpen(false);
  }

  const iscrizioniByIscritto = useMemo(() => {
    const m = new Map<string, IscrRow[]>();
    for (const r of data?.iscrizioni || []) {
      if (!m.has(r.iscrittoId)) m.set(r.iscrittoId, []);
      m.get(r.iscrittoId)!.push(r);
    }
    return m;
  }, [data]);

  const lastPrefByIscritto = useMemo(() => {
    const m = new Map<string, string | null>();
    // iscrizioni already ordered desc by data, createdAt from server
    for (const r of data?.iscrizioni || []) {
      if (!m.has(r.iscrittoId)) m.set(r.iscrittoId, r.preferenzaInsegnanteId ?? null);
    }
    return m;
  }, [data]);

  const visibleIscritti = useMemo(() => {
    const list = data?.iscritti || [];
    const q = nome.trim().toLowerCase();
    return list.filter((i) => {
      if (q) {
        const hay = `${i.codiceNumerico} ${i.cognomeIscritto} ${i.nomeIscritto}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      const history = iscrizioniByIscritto.get(i.id) || [];
      if (maiIscritti && history.length > 0) return false;
      if (fAnni && !history.some((h) => h.anni === fAnni)) return false;
      if (fCorsoId && !history.some((h) => h.corsoId === fCorsoId)) return false;
      // if filtering by anno/corso of previous enrollments, "mai iscritti" is contradictory but we honor combined filters
      return true;
    });
  }, [data, nome, fAnni, fCorsoId, maiIscritti, iscrizioniByIscritto]);

  const selectedList = useMemo(() => {
    const list = data?.iscritti || [];
    const byId = new Map(list.map((i) => [i.id, i]));
    return Array.from(selected).map((id) => byId.get(id)).filter(Boolean) as Iscritto[];
  }, [data, selected]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function selectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const i of visibleIscritti) next.add(i.id);
      return next;
    });
  }
  function deselectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const i of visibleIscritti) next.delete(i.id);
      return next;
    });
  }

  const canStep2 = selected.size > 0;
  const canStep3 = !!targetAnni.trim() && !!targetCorsoId;

  function confirm() {
    setSubmitError(null);
    startTransition(async () => {
      const res = await bulkCreateIscrizioniAction({
        anni: targetAnni.trim(),
        corsoId: targetCorsoId,
        libro,
        quota,
        iscrittoIds: Array.from(selected),
      });
      if (res.error) {
        setSubmitError(res.error);
        return;
      }
      setResult({ created: res.created, skipped: res.skipped, errors: res.errors || [] });
      if (res.created > 0) router.refresh();
    });
  }

  const targetCorsoNome = (data?.corsi || []).find((c) => c.id === targetCorsoId)?.nome || "";

  return (
    <>
      <button onClick={openWizard} className="rounded border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-50">
        Iscrizione di più ragazzi
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div className="max-h-[92vh] w-full max-w-4xl overflow-auto rounded-lg bg-white p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Iscrizione di più ragazzi</h2>
              <button onClick={close} className="text-blue-900" aria-label="Chiudi"><span className="material-symbols-outlined">close</span></button>
            </div>

            {loading || !data ? (
              <p className="text-blue-700">Caricamento...</p>
            ) : result ? (
              <div className="space-y-3">
                <div className="rounded border border-blue-100 bg-blue-50 p-3 text-sm">
                  <p><strong>Iscrizioni create:</strong> {result.created}</p>
                  <p><strong>Già presenti (saltate):</strong> {result.skipped}</p>
                  {result.errors.length > 0 ? (
                    <div className="mt-2">
                      <p className="font-medium text-red-700">Errori:</p>
                      <ul className="list-disc pl-5 text-red-700">{result.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
                    </div>
                  ) : (
                    <p className="mt-2 text-green-700">Operazione completata.</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={close} className="rounded bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">Chiudi</button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center gap-2 text-sm">
                  <span className={step === 1 ? "font-semibold text-blue-900" : "text-blue-600"}>1. Seleziona ragazzi</span>
                  <span>→</span>
                  <span className={step === 2 ? "font-semibold text-blue-900" : "text-blue-600"}>2. Anno e corso</span>
                  <span>→</span>
                  <span className={step === 3 ? "font-semibold text-blue-900" : "text-blue-600"}>3. Riepilogo</span>
                </div>

                {step === 1 ? (
                  <div className="space-y-3">
                    <div className="grid gap-3 rounded border border-blue-100 p-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="lg:col-span-2">
                        <label className="mb-1 block text-sm font-medium">Nome / cognome / codice</label>
                        <input value={nome} onChange={(e) => setNome(e.target.value)} className="w-full rounded border px-3 py-2" placeholder="Cerca..." />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Anno (precedente)</label>
                        <select value={fAnni} onChange={(e) => setFAnni(e.target.value)} className="w-full rounded border px-3 py-2">
                          <option value="">Tutti</option>
                          {data.anniOptions.map((a) => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Corso (precedente)</label>
                        <select value={fCorsoId} onChange={(e) => setFCorsoId(e.target.value)} className="w-full rounded border px-3 py-2">
                          <option value="">Tutti</option>
                          {data.corsi.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                      </div>
                      <div className="flex items-center gap-2 lg:col-span-2">
                        <input id="maiIscritti" type="checkbox" checked={maiIscritti} onChange={(e) => setMaiIscritti(e.target.checked)} />
                        <label htmlFor="maiIscritti" className="text-sm font-medium">Mai iscritti</label>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={selectAllVisible} className="rounded border border-blue-200 px-3 py-1.5 text-sm text-blue-900 hover:bg-blue-50">Seleziona tutti (visibili)</button>
                      <button type="button" onClick={deselectAllVisible} className="rounded border border-blue-200 px-3 py-1.5 text-sm text-blue-900 hover:bg-blue-50">Deseleziona visibili</button>
                      <span className="text-sm text-blue-700">Visibili: {visibleIscritti.length} — Selezionati: {selected.size}</span>
                    </div>

                    <div className="max-h-72 overflow-auto rounded border border-blue-100">
                      <table className="min-w-full text-sm">
                        <thead className="bg-blue-100 text-left text-blue-950 sticky top-0">
                          <tr>
                            <th className="px-3 py-2">Sel.</th>
                            <th className="px-3 py-2">Codice</th>
                            <th className="px-3 py-2">Cognome e nome</th>
                            <th className="px-3 py-2">Classe/Plesso</th>
                            <th className="px-3 py-2">Iscrizioni prec.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleIscritti.length === 0 ? (
                            <tr><td colSpan={5} className="px-3 py-4 text-center text-blue-700">Nessun risultato.</td></tr>
                          ) : visibleIscritti.map((i) => (
                            <tr key={i.id} className="border-t">
                              <td className="px-3 py-2"><input type="checkbox" checked={selected.has(i.id)} onChange={() => toggle(i.id)} /></td>
                              <td className="px-3 py-2">{i.codiceNumerico}</td>
                              <td className="px-3 py-2">{i.cognomeIscritto} {i.nomeIscritto}</td>
                              <td className="px-3 py-2">{i.classeScolastica} / {i.plessoScolastico}</td>
                              <td className="px-3 py-2">{(iscrizioniByIscritto.get(i.id) || []).length || "Mai iscritto"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-between gap-2">
                      <button type="button" onClick={close} className="rounded border border-blue-200 px-4 py-2 text-blue-900 hover:bg-blue-50">Annulla</button>
                      <button type="button" disabled={!canStep2} onClick={() => setStep(2)} className="rounded bg-blue-900 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-50">Avanti</button>
                    </div>
                  </div>
                ) : null}

                {step === 2 ? (
                  <div className="space-y-4">
                    <p className="text-sm text-blue-700">Ragazzi selezionati: <strong>{selected.size}</strong></p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium">Anno *</label>
                        <input value={targetAnni} onChange={(e) => setTargetAnni(e.target.value)} className="w-full rounded border px-3 py-2" placeholder="2026-2027" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Corso *</label>
                        <select value={targetCorsoId} onChange={(e) => setTargetCorsoId(e.target.value)} className="w-full rounded border px-3 py-2">
                          <option value="">Seleziona...</option>
                          {data.corsi.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-between gap-2">
                      <button type="button" onClick={() => setStep(1)} className="rounded border border-blue-200 px-4 py-2 text-blue-900 hover:bg-blue-50">Indietro</button>
                      <div className="flex gap-2">
                        <button type="button" onClick={close} className="rounded border border-blue-200 px-4 py-2 text-blue-900 hover:bg-blue-50">Annulla</button>
                        <button type="button" disabled={!canStep3} onClick={() => setStep(3)} className="rounded bg-blue-900 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-50">Avanti</button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {step === 3 ? (
                  <div className="space-y-4">
                    <div className="rounded border border-blue-100 bg-blue-50 p-3 text-sm">
                      <p><strong>Anno:</strong> {targetAnni} — <strong>Corso:</strong> {targetCorsoNome}</p>
                      <p className="mt-1 text-blue-800">L’insegnante di preferenza viene impostato all’ultimo scelto in ordine di iscrizione (se presente), altrimenti nessuna preferenza. Classe/plesso e data iscrizione (oggi) vengono presi dalla scheda anagrafica/valori correnti.</p>
                    </div>
                    <div className="flex flex-wrap items-end gap-4 rounded border border-blue-100 p-3">
                      <div className="flex items-center gap-2">
                        <input id="bulk-libro" type="checkbox" checked={libro} onChange={(e) => setLibro(e.target.checked)} />
                        <label htmlFor="bulk-libro" className="text-sm font-medium">Libro</label>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Quota (€)</label>
                        <input value={quota} onChange={(e) => setQuota(e.target.value)} className="w-32 rounded border px-3 py-2" />
                      </div>
                    </div>

                    <div className="max-h-64 overflow-auto rounded border border-blue-100">
                      <table className="min-w-full text-sm">
                        <thead className="bg-blue-100 text-left text-blue-950 sticky top-0">
                          <tr>
                            <th className="px-3 py-2">Codice</th>
                            <th className="px-3 py-2">Iscritto</th>
                            <th className="px-3 py-2">Classe/Plesso</th>
                            <th className="px-3 py-2">Libro</th>
                            <th className="px-3 py-2">Quota</th>
                            <th className="px-3 py-2">Pref. insegnante (auto)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedList.map((i) => {
                            const prevPref = lastPrefByIscritto.get(i.id);
                            return (
                              <tr key={i.id} className="border-t">
                                <td className="px-3 py-2">{i.codiceNumerico}</td>
                                <td className="px-3 py-2">{i.cognomeIscritto} {i.nomeIscritto}</td>
                                <td className="px-3 py-2">{i.classeScolastica} / {i.plessoScolastico}</td>
                                <td className="px-3 py-2">{libro ? "Sì" : "No"}</td>
                                <td className="px-3 py-2">€ {quota}</td>
                                <td className="px-3 py-2">{prevPref ? "Ultima iscrizione" : "Nessuna"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

                    <div className="flex justify-between gap-2">
                      <button type="button" onClick={() => setStep(2)} className="rounded border border-blue-200 px-4 py-2 text-blue-900 hover:bg-blue-50">Indietro</button>
                      <div className="flex gap-2">
                        <button type="button" onClick={close} className="rounded border border-blue-200 px-4 py-2 text-blue-900 hover:bg-blue-50">Annulla</button>
                        <button type="button" disabled={pending} onClick={confirm} className="rounded bg-blue-900 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-50">
                          {pending ? "Iscrizione..." : "Conferma iscrizioni"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
