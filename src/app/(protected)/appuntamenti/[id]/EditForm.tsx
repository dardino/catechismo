"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { Appuntamento } from "@/lib/db/schema";

type Corso = { id: string; nome: string };
type State = { error?: string; fieldErrors?: Record<string, string[]> };
type Action = (prev: State, formData: FormData) => Promise<State>;

function Submit() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="rounded bg-blue-900 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-50">{pending ? "Salvataggio..." : "Salva"}</button>;
}

export function EditAppuntamentoForm({ action, defaultValues, corsi }: { action: Action; defaultValues: Appuntamento; corsi: Corso[] }) {
  const [state, formAction] = useFormState(action, {} as State);
  return (
    <form action={formAction} className="max-w-md space-y-3 rounded border border-blue-100 bg-white p-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Anno *</label>
        <input name="anni" required defaultValue={defaultValues.anni || ""} className="w-full rounded border px-3 py-2" placeholder="2026-2027" />
        {state.fieldErrors?.anni ? <p className="text-xs text-red-600">{state.fieldErrors.anni[0]}</p> : null}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Corso *</label>
        <select name="corsoId" required defaultValue={defaultValues.corsoId || ""} className="w-full rounded border px-3 py-2">
          <option value="">Seleziona...</option>
          {corsi.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        {state.fieldErrors?.corsoId ? <p className="text-xs text-red-600">{state.fieldErrors.corsoId[0]}</p> : null}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Data *</label>
        <input type="date" name="data" required defaultValue={String(defaultValues.data).slice(0,10)} className="w-full rounded border px-3 py-2" />
        {state.fieldErrors?.data ? <p className="text-xs text-red-600">{state.fieldErrors.data[0]}</p> : null}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Dalle *</label>
        <input type="time" name="ora" required defaultValue={String(defaultValues.ora).slice(0,5)} className="w-full rounded border px-3 py-2" />
        {state.fieldErrors?.ora ? <p className="text-xs text-red-600">{state.fieldErrors.ora[0]}</p> : null}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Alle (opzionale)</label>
        <input type="time" name="oraFine" defaultValue={defaultValues.oraFine ? String(defaultValues.oraFine).slice(0,5) : ""} className="w-full rounded border px-3 py-2" />
        {state.fieldErrors?.oraFine ? <p className="text-xs text-red-600">{state.fieldErrors.oraFine[0]}</p> : null}
      </div>
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <div className="flex gap-2"><Submit /><a href="/appuntamenti" className="rounded border border-blue-200 px-4 py-2 text-blue-900 hover:bg-blue-50">Annulla</a></div>
    </form>
  );
}
