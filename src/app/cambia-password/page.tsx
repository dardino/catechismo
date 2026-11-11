"use client";

import { useFormState, useFormStatus } from "react-dom";
import { changePasswordAction, logoutAction } from "@/app/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded bg-blue-900 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-50"
    >
      {pending ? "Salvataggio..." : "Cambia password"}
    </button>
  );
}

export default function CambiaPasswordPage() {
  const [state, formAction] = useFormState(changePasswordAction, undefined);
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold">Cambio password obbligatorio</h1>
        <p className="mb-4 text-sm text-blue-700">
          È necessario impostare una nuova password prima di continuare.
        </p>
        <form action={formAction} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Password attuale</label>
            <input name="currentPassword" type="password" required className="w-full rounded border px-3 py-2" autoComplete="current-password" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Nuova password</label>
            <input name="newPassword" type="password" required className="w-full rounded border px-3 py-2" autoComplete="new-password" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Conferma nuova password</label>
            <input name="confirmPassword" type="password" required className="w-full rounded border px-3 py-2" autoComplete="new-password" />
          </div>
          <ul className="list-disc pl-5 text-xs text-blue-700">
            <li>Almeno 8 caratteri</li>
            <li>Almeno una lettera minuscola e una maiuscola</li>
            <li>Almeno un numero e un carattere speciale</li>
          </ul>
          {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
          <SubmitButton />
        </form>
        <form action={logoutAction} className="mt-3">
          <button type="submit" className="w-full rounded border border-blue-200 px-4 py-2 text-sm text-blue-900 hover:bg-blue-50">Esci</button>
        </form>
      </div>
    </main>
  );
}
