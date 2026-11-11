"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createClasseAction, deleteClasseAction, saveClassiBulkAction } from "@/app/actions/classi";

type Corso = { id: string; nome: string };
type Row = { id: string; iscrittoId: string; insegnanteId: string; anni: string; corsoId: string; codiceNumerico: number; cognomeIscritto: string; nomeIscritto: string; insegnanteNome: string };
type Isc = { id: string; codiceNumerico: number; cognomeIscritto: string; nomeIscritto: string; preferenzaInsegnanteId: string | null };
type Ins = { id: string; nome: string };

function Submit({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return <button disabled={pending || disabled} className="rounded bg-blue-900 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-50">{pending ? "Aggiunta..." : "Aggiungi abbinamento"}</button>;
}

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateDistribution(students: Isc[], teacherIds: string[]) {
  const k = teacherIds.length;
  const cols: Record<string, Isc[]> = {};
  teacherIds.forEach((id) => (cols[id] = []));
  if (k === 0) return cols;
  const n = students.length;
  const base = Math.floor(n / k);
  const extra = n % k;
  const targets: Record<string, number> = {};
  teacherIds.forEach((id, idx) => (targets[id] = base + (idx < extra ? 1 : 0)));

  const selectedSet = new Set(teacherIds);
  const preferred: Isc[] = [];
  const others: Isc[] = [];
  for (const s of students) {
    if (s.preferenzaInsegnanteId && selectedSet.has(s.preferenzaInsegnanteId)) preferred.push(s);
    else others.push(s);
  }

  const pool: Isc[] = [];
  // place preferred first (respect preference), overflow goes to pool
  for (const s of shuffle(preferred)) {
    const tid = s.preferenzaInsegnanteId!;
    if (cols[tid].length < targets[tid]) cols[tid].push(s);
    else pool.push(s);
  }
  pool.push(...shuffle(others));

  // fill remaining slots to targets
  for (const tid of teacherIds) {
    while (cols[tid].length < targets[tid] && pool.length) {
      cols[tid].push(pool.shift()!);
    }
  }
  // if anything left (shouldn't happen), distribute round-robin
  let idx = 0;
  while (pool.length) {
    const tid = teacherIds[idx % k];
    cols[tid].push(pool.shift()!);
    idx++;
  }
  return cols;
}

function Wizard({
  open,
  onClose,
  anni,
  corsoId,
  iscritti,
  insegnanti,
}: {
  open: boolean;
  onClose: () => void;
  anni: string;
  corsoId: string;
  iscritti: Isc[];
  insegnanti: Ins[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedTeachers, setSelectedTeachers] = useState<Record<string, boolean>>({});
  const [teacherOrder, setTeacherOrder] = useState<string[]>([]);
  const [cols, setCols] = useState<Record<string, Isc[]>>({});
  const [selectedStudent, setSelectedStudent] = useState<{ teacherId: string; studentId: string } | null>(null);
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep(1);
      setSelectedTeachers({});
      setTeacherOrder([]);
      setCols({});
      setSelectedStudent(null);
      setError(null);
    }
  }, [open]);

  const chosenTeachers = useMemo(() => teacherOrder.filter((id) => selectedTeachers[id]), [teacherOrder, selectedTeachers]);
  const teacherName = (id: string) => insegnanti.find((i) => i.id === id)?.nome || id;

  if (!open) return null;

  function toggleTeacher(id: string) {
    setSelectedTeachers((s) => {
      const next = { ...s, [id]: !s[id] };
      return next;
    });
    setTeacherOrder((o) => (o.includes(id) ? o : [...o, id]));
  }

  function genera() {
    const ids = insegnanti.map((i) => i.id).filter((id) => selectedTeachers[id]);
    if (ids.length === 0) { setError("Seleziona almeno un insegnante."); return; }
    if (iscritti.length === 0) { setError("Nessun iscritto per questo anno/corso."); return; }
    setError(null);
    setCols(generateDistribution(iscritti, ids));
    setStep(2);
  }

  function moveStudent(studentId: string, fromTid: string, toTid: string) {
    if (fromTid === toTid) return;
    setCols((prev) => {
      const from = [...(prev[fromTid] || [])];
      const idx = from.findIndex((s) => s.id === studentId);
      if (idx < 0) return prev;
      const [st] = from.splice(idx, 1);
      const to = [...(prev[toTid] || []), st];
      return { ...prev, [fromTid]: from, [toTid]: to };
    });
    setSelectedStudent({ teacherId: toTid, studentId });
  }

  function moveSelected(dir: -1 | 1) {
    if (!selectedStudent) return;
    const idx = chosenTeachers.indexOf(selectedStudent.teacherId);
    const toIdx = idx + dir;
    if (toIdx < 0 || toIdx >= chosenTeachers.length) return;
    moveStudent(selectedStudent.studentId, selectedStudent.teacherId, chosenTeachers[toIdx]);
  }

  function onDrop(toTid: string, e: React.DragEvent) {
    e.preventDefault();
    const data = e.dataTransfer.getData("text/plain");
    if (!data) return;
    try {
      const { studentId, fromTid } = JSON.parse(data);
      if (studentId && fromTid) moveStudent(studentId, fromTid, toTid);
    } catch {}
  }

  function approve() {
    setError(null);
    const assignments: { iscrittoId: string; insegnanteId: string }[] = [];
    for (const tid of chosenTeachers) {
      for (const s of cols[tid] || []) assignments.push({ iscrittoId: s.id, insegnanteId: tid });
    }
    startSaving(async () => {
      const res = await saveClassiBulkAction(anni, corsoId, assignments);
      if (res?.error) { setError(res.error); return; }
      onClose();
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="max-h-[92vh] w-full max-w-6xl overflow-auto rounded-lg bg-white p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Genera classi (wizard)</h2>
          <button onClick={onClose} className="text-blue-900"><span className="material-symbols-outlined">close</span></button>
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            <p className="text-sm text-blue-700">Seleziona gli insegnanti, poi genera una distribuzione casuale (uguale ±1) tenendo conto delle preferenze.</p>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {insegnanti.map((i) => (
                <label key={i.id} className="flex items-center gap-2 rounded border p-2">
                  <input type="checkbox" checked={!!selectedTeachers[i.id]} onChange={() => toggleTeacher(i.id)} />
                  <span>{i.nome}</span>
                </label>
              ))}
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <div className="flex gap-2">
              <button onClick={genera} className="rounded bg-blue-900 px-4 py-2 font-medium text-white hover:bg-blue-800">Genera</button>
              <button onClick={onClose} className="rounded border border-blue-200 px-4 py-2 text-blue-900 hover:bg-blue-50">Annulla</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-blue-700">Trascina i ragazzi tra le colonne oppure seleziona un ragazzo e usa le frecce ← → per spostarlo.</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => moveSelected(-1)} disabled={!selectedStudent} className="rounded border px-3 py-1 disabled:opacity-40" title="Sposta a sinistra">←</button>
                <button type="button" onClick={() => moveSelected(1)} disabled={!selectedStudent} className="rounded border px-3 py-1 disabled:opacity-40" title="Sposta a destra">→</button>
              </div>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {chosenTeachers.map((tid) => (
                <div
                  key={tid}
                  className="min-w-[220px] flex-1 rounded border border-blue-100 bg-blue-50/30"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => onDrop(tid, e)}
                >
                  <div className="border-b border-blue-100 bg-blue-100 px-3 py-2 font-medium text-blue-950">
                    {teacherName(tid)} <span className="text-xs font-normal">({(cols[tid] || []).length})</span>
                  </div>
                  <div className="min-h-[120px] space-y-1 p-2">
                    {(cols[tid] || []).map((s) => {
                      const sel = selectedStudent?.studentId === s.id;
                      return (
                        <div
                          key={s.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", JSON.stringify({ studentId: s.id, fromTid: tid }));
                            setSelectedStudent({ teacherId: tid, studentId: s.id });
                          }}
                          onClick={() => setSelectedStudent({ teacherId: tid, studentId: s.id })}
                          className={`cursor-move rounded border bg-white px-2 py-1 text-sm ${sel ? "border-blue-600 ring-1 ring-blue-600" : "border-blue-100 hover:border-blue-300"}`}
                          title={s.preferenzaInsegnanteId ? "Ha una preferenza insegnante" : undefined}
                        >
                          <span className="font-medium">{s.codiceNumerico}</span> {s.cognomeIscritto} {s.nomeIscritto}
                          {s.preferenzaInsegnanteId === tid ? <span className="ml-1 text-xs text-green-700" title="Preferenza rispettata">★</span> : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <div className="flex gap-2">
              <button disabled={saving} onClick={approve} className="rounded bg-blue-900 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-50">{saving ? "Salvataggio..." : "Approva"}</button>
              <button disabled={saving} onClick={onClose} className="rounded border border-blue-200 px-4 py-2 text-blue-900 hover:bg-blue-50 disabled:opacity-50">Annulla</button>
              <button disabled={saving} onClick={() => setStep(1)} className="rounded border border-blue-200 px-4 py-2 text-blue-900 hover:bg-blue-50 disabled:opacity-50">Indietro</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ClassiManager({
  corsi,
  anniOptions,
  selectedAnni,
  selectedCorsoId,
  rows,
  iscritti,
  insegnanti,
}: {
  corsi: Corso[];
  anniOptions: string[];
  selectedAnni: string;
  selectedCorsoId: string;
  rows: Row[];
  iscritti: Isc[];
  insegnanti: Ins[];
}) {
  const router = useRouter();
  const [state, action] = useFormState(createClasseAction, undefined);
  const [pending, startTransition] = useTransition();
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    const sa = sessionStorage.getItem("classi.anni") || "";
    const sc = sessionStorage.getItem("classi.corsoId") || "";
    if ((!selectedAnni || !selectedCorsoId) && (sa || sc)) {
      const p = new URLSearchParams();
      if (sa) p.set("anni", sa);
      if (sc) p.set("corsoId", sc);
      router.replace(`/classi?${p}`);
      return;
    }
    if (selectedAnni) sessionStorage.setItem("classi.anni", selectedAnni); else sessionStorage.removeItem("classi.anni");
    if (selectedCorsoId) sessionStorage.setItem("classi.corsoId", selectedCorsoId); else sessionStorage.removeItem("classi.corsoId");
  }, [selectedAnni, selectedCorsoId, router]);

  function setFilters(anni: string, corsoId: string) {
    if (anni) sessionStorage.setItem("classi.anni", anni);
    if (corsoId) sessionStorage.setItem("classi.corsoId", corsoId);
    const p = new URLSearchParams();
    if (anni) p.set("anni", anni);
    if (corsoId) p.set("corsoId", corsoId);
    router.push(`/classi${p.toString() ? `?${p}` : ""}`);
  }

  function clearFilters() {
    sessionStorage.removeItem("classi.anni");
    sessionStorage.removeItem("classi.corsoId");
    router.push("/classi");
  }

  const ready = !!(selectedAnni && selectedCorsoId);

  return (
    <div className="space-y-4">
      <div className="rounded border border-blue-100 bg-white p-4 space-y-3">
        <p className="text-sm text-blue-700">Seleziona prima <strong>anno</strong> e <strong>corso</strong> per gestire gli abbinamenti.</p>
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

      {ready ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div />
            <button
              type="button"
              onClick={() => setWizardOpen(true)}
              className="rounded bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
              title="Genera classi automaticamente"
            >
              Genera classi (wizard)
            </button>
          </div>

          <form action={action} className="grid gap-3 rounded border border-blue-100 bg-white p-4 sm:grid-cols-3 sm:items-end">
            <input type="hidden" name="anni" value={selectedAnni} />
            <input type="hidden" name="corsoId" value={selectedCorsoId} />
            <div>
              <label className="mb-1 block text-sm font-medium">Iscritto (iscrizioni anno/corso)</label>
              <select name="iscrittoId" required className="w-full rounded border px-3 py-2" defaultValue="">
                <option value="">Seleziona...</option>
                {iscritti.map((i) => (
                  <option key={i.id} value={i.id}>{i.codiceNumerico} - {i.cognomeIscritto} {i.nomeIscritto}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Insegnante</label>
              <select name="insegnanteId" required className="w-full rounded border px-3 py-2" defaultValue="">
                <option value="">Seleziona...</option>
                {insegnanti.map((i) => (
                  <option key={i.id} value={i.id}>{i.nome}</option>
                ))}
              </select>
            </div>
            <div><Submit disabled={!ready} /></div>
            {state?.error ? <p className="text-sm text-red-600 sm:col-span-3">{state.error}</p> : null}
            {iscritti.length === 0 ? <p className="text-sm text-blue-700 sm:col-span-3">Nessun iscritto per questo anno/corso (verifica le iscrizioni).</p> : null}
          </form>

          <div className="overflow-x-auto rounded border border-blue-100 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-blue-100 text-left text-blue-950"><tr><th className="px-3 py-2">Codice</th><th className="px-3 py-2">Iscritto</th><th className="px-3 py-2">Insegnante</th><th className="px-3 py-2">Azioni</th></tr></thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={4} className="px-3 py-6 text-center text-blue-700">Nessun abbinamento per questo anno/corso.</td></tr>
                ) : rows.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2">{r.codiceNumerico}</td>
                    <td className="px-3 py-2">{r.cognomeIscritto} {r.nomeIscritto}</td>
                    <td className="px-3 py-2">{r.insegnanteNome}</td>
                    <td className="px-3 py-2">
                      <button disabled={pending} className="text-red-700 hover:text-red-800" title="Rimuovi" onClick={() => startTransition(async () => { await deleteClasseAction(r.id); })}>
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Wizard
            open={wizardOpen}
            onClose={() => setWizardOpen(false)}
            anni={selectedAnni}
            corsoId={selectedCorsoId}
            iscritti={iscritti}
            insegnanti={insegnanti}
          />
        </>
      ) : null}
    </div>
  );
}
