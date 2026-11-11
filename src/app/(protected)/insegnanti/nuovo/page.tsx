"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createInsegnanteAction } from "@/app/actions/insegnanti";

function Submit() {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="rounded bg-blue-900 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-50">{pending ? "Salvataggio..." : "Crea"}</button>;
}

export default function NuovoInsegnantePage() {
  const [state, action] = useFormState(createInsegnanteAction, {});
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Nuovo insegnante</h1>
      <form action={action} className="max-w-md space-y-3 rounded border border-blue-100 bg-white p-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Nome *</label>
          <input type="text" name="nome" required className="w-full rounded border px-3 py-2" />
          {state.fieldErrors?.nome ? <p className="text-xs text-red-600">{state.fieldErrors.nome[0]}</p> : null}
        </div>
        {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
        <div className="flex gap-2"><Submit /><a href="/insegnanti" className="rounded border border-blue-200 px-4 py-2 text-blue-900 hover:bg-blue-50">Annulla</a></div>
      </form>
    </div>
  );
}
