"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  createUserAction,
  deleteUserAction,
  resetUserPasswordAction,
  updateUserRoleAction,
  type UserActionState,
} from "@/app/actions/users";

type UserRow = {
  id: string;
  username: string;
  role: "admin" | "standard" | "viewer";
  mustChangePassword: boolean;
  createdAt: Date | string;
};

function Submit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="rounded bg-blue-900 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">
      {pending ? pendingLabel : label}
    </button>
  );
}

export function UsersManager({ initialUsers, currentUserId }: { initialUsers: UserRow[]; currentUserId: string }) {
  const router = useRouter();
  const [createState, createFormAction] = useFormState(createUserAction, {});
  const [roleState, roleFormAction] = useFormState(updateUserRoleAction, {});
  const [resetState, resetFormAction] = useFormState(resetUserPasswordAction, {});
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  return (
    <section className="space-y-4 rounded border border-blue-100 bg-white p-4">
      <div>
        <h2 className="text-lg font-semibold">Gestione utenti</h2>
        <p className="text-sm text-blue-700">
          Accesso riservato agli amministratori. L&apos;utente <strong>Admin</strong> predefinito è sempre presente.
        </p>
      </div>

      <div className="overflow-x-auto rounded border border-blue-100">
        <table className="min-w-full text-sm">
          <thead className="bg-blue-100 text-left text-blue-950">
            <tr>
              <th className="px-3 py-2">Username</th>
              <th className="px-3 py-2">Ruolo</th>
              <th className="px-3 py-2">Password</th>
              <th className="px-3 py-2">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {initialUsers.map((u) => (
              <tr key={u.id} className="border-t align-top">
                <td className="px-3 py-2 font-medium">{u.username}{u.id === currentUserId ? " (tu)" : ""}</td>
                <td className="px-3 py-2">
                  <form action={roleFormAction} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={u.id} />
                    <select name="role" defaultValue={u.role} className="rounded border px-2 py-1">
                      <option value="admin">Admin</option>
                      <option value="standard">Standard</option>
                      <option value="viewer">Viewer (sola lettura)</option>
                    </select>
                    <Submit label="Salva ruolo" pendingLabel="..." />
                  </form>
                </td>
                <td className="px-3 py-2">
                  {u.mustChangePassword ? <span className="text-amber-700">Cambio richiesto</span> : <span className="text-green-700">OK</span>}
                  <details className="mt-2">
                    <summary className="cursor-pointer text-blue-900">Reimposta password</summary>
                    <form action={resetFormAction} className="mt-2 flex flex-wrap items-end gap-2">
                      <input type="hidden" name="id" value={u.id} />
                      <div>
                        <label className="mb-1 block text-xs font-medium">Nuova password</label>
                        <input name="password" type="password" required className="rounded border px-2 py-1" autoComplete="new-password" />
                      </div>
                      <Submit label="Reimposta" pendingLabel="..." />
                    </form>
                    <p className="mt-1 text-xs text-blue-700">L&apos;utente dovrà cambiarla al prossimo accesso. Requisiti: 8+ caratteri, maiuscola, minuscola, numero, speciale.</p>
                  </details>
                </td>
                <td className="px-3 py-2">
                  {u.username !== "Admin" && u.id !== currentUserId ? (
                    <button
                      disabled={pending}
                      className="text-red-700 hover:text-red-800 disabled:opacity-50"
                      title="Elimina utente"
                      onClick={() => {
                        if (!confirm(`Eliminare l'utente "${u.username}"?`)) return;
                        setMsg(null); setErr(null);
                        startTransition(async () => {
                          const res = await deleteUserAction(u.id);
                          if ((res as UserActionState)?.error) setErr((res as UserActionState).error || "Errore");
                          else { setMsg("Utente eliminato."); router.refresh(); }
                        });
                      }}
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  ) : (
                    <span className="text-xs text-blue-600">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {roleState?.error ? <p className="text-sm text-red-600">Ruolo: {roleState.error}</p> : null}
      {roleState?.ok ? <p className="text-sm text-green-700">Ruolo aggiornato.</p> : null}
      {resetState?.error ? <p className="text-sm text-red-600">Password: {resetState.error}</p> : null}
      {resetState?.ok ? <p className="text-sm text-green-700">Password reimpostata.</p> : null}
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
      {msg ? <p className="text-sm text-green-700">{msg}</p> : null}

      <div className="rounded border border-blue-100 p-3">
        <h3 className="mb-2 font-medium">Nuovo utente</h3>
        <form action={createFormAction} className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Username *</label>
            <input name="username" required className="w-full rounded border px-3 py-2" autoComplete="off" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Ruolo *</label>
            <select name="role" defaultValue="standard" className="w-full rounded border px-3 py-2">
              <option value="admin">Admin (accesso completo, inclusa Configurazione)</option>
              <option value="standard">Standard (può modificare, senza Configurazione)</option>
              <option value="viewer">Viewer (sola lettura)</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium">Password iniziale *</label>
            <input name="password" type="password" required className="w-full rounded border px-3 py-2" autoComplete="new-password" />
            <p className="mt-1 text-xs text-blue-700">L&apos;utente dovrà cambiarla al primo accesso. Requisiti: almeno 8 caratteri, una maiuscola, una minuscola, un numero, un carattere speciale.</p>
          </div>
          {createState?.error ? <p className="text-sm text-red-600 sm:col-span-2">{createState.error}</p> : null}
          {createState?.ok ? <p className="text-sm text-green-700 sm:col-span-2">Utente creato.</p> : null}
          <div className="sm:col-span-2">
            <Submit label="Crea utente" pendingLabel="Creazione..." />
          </div>
        </form>
      </div>
    </section>
  );
}
