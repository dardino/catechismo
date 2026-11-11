"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { Insegnante } from "@/lib/db/schema";

type State = { error?: string; fieldErrors?: Record<string, string[]> };
type Action = (prev: State, formData: FormData) => Promise<State>;

function Submit() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="rounded bg-blue-900 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-50">{pending ? "Salvataggio..." : "Salva"}</button>;
}

export function EditInsegnanteForm({ action, defaultValues }: { action: Action; defaultValues: Insegnante }) {
  const [state, formAction] = useFormState(action, {} as State);
  return (
    <form action={formAction} className="max-w-md space-y-3 rounded border border-blue-100 bg-white p-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Nome *</label>
        <input type="text" name="nome" required defaultValue={defaultValues.nome} className="w-full rounded border px-3 py-2" />
        {state.fieldErrors?.nome ? <p className="text-xs text-red-600">{state.fieldErrors.nome[0]}</p> : null}
      </div>
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
      <div className="flex gap-2"><Submit /><a href="/insegnanti" className="rounded border border-blue-200 px-4 py-2 text-blue-900 hover:bg-blue-50">Annulla</a></div>
    </form>
  );
}
