"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createIscrizioneAnnoAction, deleteIscrizioneAnnoAction, updateIscrizioneAnnoAction } from "@/app/actions/iscrizioni";
import { BulkIscrizioneWizard } from "./BulkIscrizioneWizard";

type Corso = { id: string; nome: string; ordine: number };
type IscrittoOpt = { id: string; codiceNumerico: number; cognomeIscritto: string; nomeIscritto: string; classeScolastica: string; plessoScolastico: string; libroConsegnato: boolean; quotaVersata: string };
type Ins = { id: string; nome: string };
type Row = { id: string; dataIscrizione: string; anni: string; corsoId: string; corsoNome: string; libro: boolean; quota: string; classe: string; plesso: string; iscrittoId: string; codiceNumerico: number; cognomeIscritto: string; nomeIscritto: string; preferenzaInsegnanteId: string | null; preferenzaInsegnanteNome: string | null };

function fmtDate(d: string) {
  const [y, m, day] = String(d).split("-");
  return y && m && day ? `${day}/${m}/${y}` : d;
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Submit({ label = "Salva iscrizione" }: { label?: string }) {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="rounded bg-blue-900 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-50">{pending ? "Salvataggio..." : label}</button>;
}

export function IscrizioniManager({
  initialRows,
  corsi,
  iscritti,
  anniOptions,
  annoCorrente,
  selectedAnni,
  selectedCorsoId,
  insegnanti,
}: {
  initialRows: Row[];
  corsi: Corso[];
  iscritti: IscrittoOpt[];
  anniOptions: string[];
  annoCorrente: string;
  selectedAnni: string;
  selectedCorsoId: string;
  insegnanti: Ins[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [pending, startTransition] = useTransition();
  const [state, formAction] = useFormState(createIscrizioneAnnoAction, {});
  const [selectedIscrittoId, setSelectedIscrittoId] = useState("");
  const [libro, setLibro] = useState(false);
  const [quota, setQuota] = useState("0,00");
  const [classe, setClasse] = useState("");
  const [plesso, setPlesso] = useState("");
  const [anni, setAnni] = useState(annoCorrente);
  const [dataIscrizione, setDataIscrizione] = useState(todayIso());
  const [corsoId, setCorsoId] = useState("");
  const [preferenzaInsegnanteId, setPreferenzaInsegnanteId] = useState("");

  useEffect(() => {
    const saved = sessionStorage.getItem("iscrizioni.corsoId");
    if (saved && corsi.some((c) => c.id === saved)) setCorsoId(saved);
  }, [corsi]);

  useEffect(() => {
    if (corsoId) sessionStorage.setItem("iscrizioni.corsoId", corsoId);
  }, [corsoId]);

  const iscritto = useMemo(() => iscritti.find((i) => i.id === selectedIscrittoId), [iscritti, selectedIscrittoId]);

  useEffect(() => {
    if (!iscritto) return;
    setLibro(!!iscritto.libroConsegnato);
    setQuota(String(iscritto.quotaVersata || "0").replace(".", ","));
    setClasse(iscritto.classeScolastica || "");
    setPlesso(iscritto.plessoScolastico || "");
  }, [iscritto]);

  useEffect(() => {
    if (state?.ok) {
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);

  useEffect(() => {
    const sa = sessionStorage.getItem("iscrizioni.filtro.anni") || "";
    const sc = sessionStorage.getItem("iscrizioni.filtro.corsoId") || "";
    if (!selectedAnni && !selectedCorsoId && (sa || sc)) {
      const p = new URLSearchParams();
      if (sa) p.set("anni", sa);
      if (sc) p.set("corsoId", sc);
      router.replace(`/iscrizioni?${p}`);
      return;
    }
    if (selectedAnni) sessionStorage.setItem("iscrizioni.filtro.anni", selectedAnni); else sessionStorage.removeItem("iscrizioni.filtro.anni");
    if (selectedCorsoId) sessionStorage.setItem("iscrizioni.filtro.corsoId", selectedCorsoId); else sessionStorage.removeItem("iscrizioni.filtro.corsoId");
  }, [selectedAnni, selectedCorsoId, router]);

  function applyFilters(nextAnni: string, nextCorsoId: string) {
    const p = new URLSearchParams();
    if (nextAnni) p.set("anni", nextAnni);
    if (nextCorsoId) p.set("corsoId", nextCorsoId);
    router.push(`/iscrizioni${p.toString() ? `?${p}` : ""}`);
  }

  function clearFilters() {
    sessionStorage.removeItem("iscrizioni.filtro.anni");
    sessionStorage.removeItem("iscrizioni.filtro.corsoId");
    router.push("/iscrizioni");
  }

  function openModal() {
    setSelectedIscrittoId("");
    setAnni(annoCorrente);
    setDataIscrizione(todayIso());
    setLibro(false);
    setQuota("0,00");
    setClasse("");
    setPlesso("");
    setPreferenzaInsegnanteId("");
    const saved = sessionStorage.getItem("iscrizioni.corsoId");
    if (saved && corsi.some((c) => c.id === saved)) setCorsoId(saved);
    else setCorsoId("");
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded border border-blue-100 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Anno</label>
            <select value={selectedAnni} onChange={(e) => applyFilters(e.target.value, selectedCorsoId)} className="rounded border px-3 py-2">
              <option value="">Tutti</option>
              {anniOptions.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Corso</label>
            <select value={selectedCorsoId} onChange={(e) => applyFilters(selectedAnni, e.target.value)} className="rounded border px-3 py-2">
              <option value="">Tutti</option>
              {corsi.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          {(selectedAnni || selectedCorsoId) ? (
            <button type="button" onClick={clearFilters} className="rounded border border-blue-200 px-3 py-2 text-sm text-blue-900 hover:bg-blue-50">Cancella filtri</button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <BulkIscrizioneWizard />
          <button onClick={openModal} className="rounded bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">Aggiungi iscritto</button>
        </div>
      </div>

      <div className="overflow-x-auto rounded border border-blue-100 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-blue-100 text-left text-blue-950">
            <tr>
              <th className="px-3 py-2">Data iscrizione</th>
              <th className="px-3 py-2">Anno</th>
              <th className="px-3 py-2">Corso</th>
              <th className="px-3 py-2">Codice</th>
              <th className="px-3 py-2">Iscritto</th>
              <th className="px-3 py-2">Classe</th>
              <th className="px-3 py-2">Plesso</th>
              <th className="px-3 py-2">Libro</th>
              <th className="px-3 py-2">Quota</th>
              <th className="px-3 py-2">Pref. insegnante</th>
              <th className="px-3 py-2">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {initialRows.length === 0 ? (
              <tr><td colSpan={11} className="px-3 py-6 text-center text-blue-700">Nessuna iscrizione.</td></tr>
            ) : initialRows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{fmtDate(r.dataIscrizione)}</td>
                <td className="px-3 py-2">{r.anni}</td>
                <td className="px-3 py-2">{r.corsoNome}</td>
                <td className="px-3 py-2">{r.codiceNumerico}</td>
                <td className="px-3 py-2">{r.cognomeIscritto} {r.nomeIscritto}</td>
                <td className="px-3 py-2">{r.classe}</td>
                <td className="px-3 py-2">{r.plesso}</td>
                <td className="px-3 py-2">{r.libro ? "Sì" : "No"}</td>
                <td className="px-3 py-2">€ {String(r.quota).replace(".", ",")}</td>
                <td className="px-3 py-2">{r.preferenzaInsegnanteNome || "-"}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <button className="text-blue-900 hover:text-blue-700" title="Modifica" onClick={() => setEditRow(r)}>
                      <span className="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                    <button
                      disabled={pending}
                      className="text-red-700 hover:text-red-800 disabled:opacity-50"
                      title="Rimuovi"
                      onClick={() => { if (confirm("Rimuovere questa iscrizione?")) startTransition(async () => { await deleteIscrizioneAnnoAction(r.id); }); }}
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg bg-white p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Aggiungi iscritto all’anno</h2>
              <button onClick={() => setOpen(false)} className="text-blue-900"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form action={formAction} className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">Iscritto (anagrafica) *</label>
                <select name="iscrittoId" required value={selectedIscrittoId} onChange={(e) => setSelectedIscrittoId(e.target.value)} className="w-full rounded border px-3 py-2">
                  <option value="">Seleziona...</option>
                  {iscritti.map((i) => <option key={i.id} value={i.id}>{i.codiceNumerico} - {i.cognomeIscritto} {i.nomeIscritto}</option>)}
                </select>
                {state.fieldErrors?.iscrittoId ? <p className="text-xs text-red-600">{state.fieldErrors.iscrittoId[0]}</p> : null}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Data iscrizione *</label>
                <input type="date" name="dataIscrizione" required value={dataIscrizione} onChange={(e) => setDataIscrizione(e.target.value)} className="w-full rounded border px-3 py-2" />
                {state.fieldErrors?.dataIscrizione ? <p className="text-xs text-red-600">{state.fieldErrors.dataIscrizione[0]}</p> : null}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Anno *</label>
                <input name="anni" required value={anni} onChange={(e) => setAnni(e.target.value)} className="w-full rounded border px-3 py-2" placeholder="2026-2027" />
                {state.fieldErrors?.anni ? <p className="text-xs text-red-600">{state.fieldErrors.anni[0]}</p> : null}
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">Corso *</label>
                <select name="corsoId" required value={corsoId} onChange={(e) => setCorsoId(e.target.value)} className="w-full rounded border px-3 py-2">
                  <option value="">Seleziona...</option>
                  {corsi.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
                {state.fieldErrors?.corsoId ? <p className="text-xs text-red-600">{state.fieldErrors.corsoId[0]}</p> : null}
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">Preferenza insegnante</label>
                <select name="preferenzaInsegnanteId" value={preferenzaInsegnanteId} onChange={(e) => setPreferenzaInsegnanteId(e.target.value)} className="w-full rounded border px-3 py-2">
                  <option value="">Nessuna preferenza</option>
                  {insegnanti.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input id="libro" name="libro" type="checkbox" checked={libro} onChange={(e) => setLibro(e.target.checked)} />
                <label htmlFor="libro" className="text-sm font-medium">Libro ricevuto</label>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Quota (€) *</label>
                <input name="quota" required value={quota} onChange={(e) => setQuota(e.target.value)} className="w-full rounded border px-3 py-2" />
                {state.fieldErrors?.quota ? <p className="text-xs text-red-600">{state.fieldErrors.quota[0]}</p> : null}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Classe *</label>
                <input name="classe" required value={classe} onChange={(e) => setClasse(e.target.value)} className="w-full rounded border px-3 py-2" />
                {state.fieldErrors?.classe ? <p className="text-xs text-red-600">{state.fieldErrors.classe[0]}</p> : null}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Plesso *</label>
                <input name="plesso" required value={plesso} onChange={(e) => setPlesso(e.target.value)} className="w-full rounded border px-3 py-2" />
                {state.fieldErrors?.plesso ? <p className="text-xs text-red-600">{state.fieldErrors.plesso[0]}</p> : null}
              </div>
              {state.error ? <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p> : null}
              <div className="flex gap-2 sm:col-span-2">
                <Submit />
                <button type="button" onClick={() => setOpen(false)} className="rounded border border-blue-200 px-4 py-2 text-blue-900 hover:bg-blue-50">Annulla</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editRow ? (
        <EditIscrizioneModal
          key={editRow.id}
          row={editRow}
          corsi={corsi}
          iscritti={iscritti}
          insegnanti={insegnanti}
          onClose={() => setEditRow(null)}
          onSaved={() => { setEditRow(null); router.refresh(); }}
        />
      ) : null}
    </div>
  );
}

function EditIscrizioneModal({
  row,
  corsi,
  iscritti,
  insegnanti,
  onClose,
  onSaved,
}: {
  row: Row;
  corsi: Corso[];
  iscritti: IscrittoOpt[];
  insegnanti: Ins[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const action = updateIscrizioneAnnoAction.bind(null, row.id);
  const [state, formAction] = useFormState(action, {});
  useEffect(() => { if (state?.ok) onSaved(); }, [state, onSaved]);

  const iscrittiOpts = useMemo(() => {
    if (iscritti.some((i) => i.id === row.iscrittoId)) return iscritti;
    return [{ id: row.iscrittoId, codiceNumerico: row.codiceNumerico, cognomeIscritto: row.cognomeIscritto, nomeIscritto: row.nomeIscritto, classeScolastica: row.classe, plessoScolastico: row.plesso, libroConsegnato: row.libro, quotaVersata: String(row.quota) }, ...iscritti];
  }, [iscritti, row]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg bg-white p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Modifica iscrizione</h2>
          <button onClick={onClose} className="text-blue-900"><span className="material-symbols-outlined">close</span></button>
        </div>
        <form action={formAction} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Iscritto (anagrafica) *</label>
            <select name="iscrittoId" required defaultValue={row.iscrittoId} className="w-full rounded border px-3 py-2">
              <option value="">Seleziona...</option>
              {iscrittiOpts.map((i) => <option key={i.id} value={i.id}>{i.codiceNumerico} - {i.cognomeIscritto} {i.nomeIscritto}</option>)}
            </select>
            {state.fieldErrors?.iscrittoId ? <p className="text-xs text-red-600">{state.fieldErrors.iscrittoId[0]}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Data iscrizione *</label>
            <input type="date" name="dataIscrizione" required defaultValue={String(row.dataIscrizione).slice(0, 10)} className="w-full rounded border px-3 py-2" />
            {state.fieldErrors?.dataIscrizione ? <p className="text-xs text-red-600">{state.fieldErrors.dataIscrizione[0]}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Anno *</label>
            <input name="anni" required defaultValue={row.anni} className="w-full rounded border px-3 py-2" placeholder="2026-2027" />
            {state.fieldErrors?.anni ? <p className="text-xs text-red-600">{state.fieldErrors.anni[0]}</p> : null}
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Corso *</label>
            <select name="corsoId" required defaultValue={row.corsoId} className="w-full rounded border px-3 py-2">
              <option value="">Seleziona...</option>
              {corsi.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            {state.fieldErrors?.corsoId ? <p className="text-xs text-red-600">{state.fieldErrors.corsoId[0]}</p> : null}
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Preferenza insegnante</label>
            <select name="preferenzaInsegnanteId" defaultValue={row.preferenzaInsegnanteId || ""} className="w-full rounded border px-3 py-2">
              <option value="">Nessuna preferenza</option>
              {insegnanti.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input id={`libro-${row.id}`} name="libro" type="checkbox" defaultChecked={row.libro} />
            <label htmlFor={`libro-${row.id}`} className="text-sm font-medium">Libro ricevuto</label>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Quota (€) *</label>
            <input name="quota" required defaultValue={String(row.quota).replace(".", ",")} className="w-full rounded border px-3 py-2" />
            {state.fieldErrors?.quota ? <p className="text-xs text-red-600">{state.fieldErrors.quota[0]}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Classe *</label>
            <input name="classe" required defaultValue={row.classe} className="w-full rounded border px-3 py-2" />
            {state.fieldErrors?.classe ? <p className="text-xs text-red-600">{state.fieldErrors.classe[0]}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Plesso *</label>
            <input name="plesso" required defaultValue={row.plesso} className="w-full rounded border px-3 py-2" />
            {state.fieldErrors?.plesso ? <p className="text-xs text-red-600">{state.fieldErrors.plesso[0]}</p> : null}
          </div>
          {state.error ? <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p> : null}
          <div className="flex gap-2 sm:col-span-2">
            <Submit label="Salva modifiche" />
            <button type="button" onClick={onClose} className="rounded border border-blue-200 px-4 py-2 text-blue-900 hover:bg-blue-50">Annulla</button>
          </div>
        </form>
      </div>
    </div>
  );
}
