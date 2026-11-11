"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState, useTransition } from "react";
import { createCorsoAction, deleteCorsoAction, updateCorsoAction } from "@/app/actions/corsi";

type Corso = { id: string; nome: string; ordine: number };

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button disabled={pending} className="rounded bg-blue-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">{pending ? "..." : label}</button>;
}

export function CorsiManager({ initialCorsi }: { initialCorsi: Corso[] }) {
  const [createState, createAction] = useFormState(createCorsoAction, {});
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <section className="space-y-3 rounded border border-blue-100 bg-white p-4">
      <h2 className="font-semibold">Corsi (impostazioni)</h2>
      <p className="text-sm text-blue-700">Gestisci l’elenco dei corsi utilizzati nelle iscrizioni annuali.</p>

      <form action={createAction} className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Nome corso</label>
          <input name="nome" required className="w-80 max-w-full rounded border px-3 py-2" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Ordine</label>
          <input name="ordine" type="number" defaultValue={initialCorsi.length + 1} className="w-24 rounded border px-3 py-2" />
        </div>
        <Submit label="Aggiungi corso" />
        {createState.fieldErrors?.nome ? <p className="w-full text-sm text-red-600">{createState.fieldErrors.nome[0]}</p> : null}
        {createState.error ? <p className="w-full text-sm text-red-600">{createState.error}</p> : null}
      </form>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-blue-100 text-left text-blue-950"><tr><th className="px-3 py-2">Ordine</th><th className="px-3 py-2">Nome</th><th className="px-3 py-2">Azioni</th></tr></thead>
          <tbody>
            {initialCorsi.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="px-3 py-2">{c.ordine}</td>
                <td className="px-3 py-2">
                  {editing === c.id ? (
                    <EditCorsoInline corso={c} onDone={() => setEditing(null)} />
                  ) : (
                    c.nome
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {editing !== c.id ? (
                      <button className="text-blue-900 hover:text-blue-700" title="Modifica" onClick={() => setEditing(c.id)}>
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                    ) : null}
                    <button
                      disabled={pending}
                      className="text-red-700 hover:text-red-800 disabled:opacity-50"
                      title="Elimina"
                      onClick={() => {
                        if (!confirm("Eliminare questo corso? (fallisce se usato nelle iscrizioni)")) return;
                        startTransition(async () => { await deleteCorsoAction(c.id); });
                      }}
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {initialCorsi.length === 0 ? <tr><td colSpan={3} className="px-3 py-4 text-blue-700">Nessun corso.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EditCorsoInline({ corso, onDone }: { corso: Corso; onDone: () => void }) {
  const [state, action] = useFormState(updateCorsoAction.bind(null, corso.id), {});
  return (
    <form action={async (fd) => { await action(fd); onDone(); }} className="flex flex-wrap items-center gap-2">
      <input name="ordine" type="number" defaultValue={corso.ordine} className="w-20 rounded border px-2 py-1" />
      <input name="nome" defaultValue={corso.nome} required className="min-w-64 flex-1 rounded border px-2 py-1" />
      <button className="rounded bg-blue-900 px-2 py-1 text-xs text-white">Salva</button>
      <button type="button" className="rounded border px-2 py-1 text-xs" onClick={onDone}>Annulla</button>
      {state.fieldErrors?.nome ? <span className="text-xs text-red-600">{state.fieldErrors.nome[0]}</span> : null}
    </form>
  );
}
