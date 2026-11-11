"use client";

import { deleteIscrittoAction } from "@/app/actions/iscritti";
import { useTransition } from "react";

export function DeleteIscrittoButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="inline-flex items-center text-red-700 hover:text-red-800 disabled:opacity-50"
      title="Elimina"
      aria-label="Elimina"
      onClick={() => {
        if (!confirm("Eliminare questo iscritto?")) return;
        startTransition(async () => {
          await deleteIscrittoAction(id);
        });
      }}
    >
      <span className="material-symbols-outlined text-[20px]">
        {pending ? "hourglass_top" : "delete"}
      </span>
    </button>
  );
}
