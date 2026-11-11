"use client";

import { toggleIscrittoNascostoAction } from "@/app/actions/iscritti";
import { useTransition } from "react";

export function ToggleNascostoButton({ id, nascosto }: { id: string; nascosto: boolean }) {
  const [pending, startTransition] = useTransition();
  const next = !nascosto;
  const label = nascosto ? "Mostra" : "Nascondi";
  const icon = nascosto ? "visibility" : "visibility_off";
  return (
    <button
      type="button"
      disabled={pending}
      className="inline-flex items-center text-blue-900 hover:text-blue-700 disabled:opacity-50"
      title={label}
      aria-label={label}
      onClick={() => {
        startTransition(async () => {
          await toggleIscrittoNascostoAction(id, next);
        });
      }}
    >
      <span className="material-symbols-outlined text-[20px]">{pending ? "hourglass_top" : icon}</span>
    </button>
  );
}
