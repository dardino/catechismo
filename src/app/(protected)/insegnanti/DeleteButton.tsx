"use client";

import { deleteInsegnanteAction } from "@/app/actions/insegnanti";
import { useTransition } from "react";

export function DeleteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      className="text-red-700 hover:text-red-800 disabled:opacity-50"
      title="Elimina"
      onClick={() => {
        if (!confirm("Eliminare questo insegnante?")) return;
        startTransition(async () => { await deleteInsegnanteAction(id); });
      }}
    >
      <span className="material-symbols-outlined text-[20px]">{pending ? "hourglass_top" : "delete"}</span>
    </button>
  );
}
