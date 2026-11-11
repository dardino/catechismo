"use client";

import { deleteAppuntamentoAction } from "@/app/actions/appuntamenti";
import { useTransition } from "react";

export function DeleteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      className="text-red-700 hover:text-red-800 disabled:opacity-50"
      title="Elimina"
      onClick={() => {
        if (!confirm("Eliminare questo appuntamento?")) return;
        startTransition(async () => { await deleteAppuntamentoAction(id); });
      }}
    >
      <span className="material-symbols-outlined text-[20px]">{pending ? "hourglass_top" : "delete"}</span>
    </button>
  );
}
