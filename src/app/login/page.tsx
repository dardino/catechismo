"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAction } from "@/app/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded bg-blue-900 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-50"
    >
      {pending ? "Accesso..." : "Accedi"}
    </button>
  );
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const [state, formAction] = useFormState(loginAction, undefined);
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold">Accesso</h1>
        <p className="mb-4 text-sm text-blue-700">Inserisci le credenziali per continuare.</p>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="next" value={searchParams.next || "/iscritti"} />
          <div>
            <label className="mb-1 block text-sm font-medium">Username</label>
            <input name="username" type="text" required className="w-full rounded border px-3 py-2" autoFocus autoComplete="username" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Password</label>
            <input name="password" type="password" required className="w-full rounded border px-3 py-2" autoComplete="current-password" />
          </div>
          {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
          <SubmitButton />
        </form>
        <p className="mt-3 text-xs text-blue-700">Utente predefinito: <strong>Admin</strong> / <strong>admin</strong> (cambio password richiesto al primo accesso).</p>
      </div>
    </main>
  );
}
