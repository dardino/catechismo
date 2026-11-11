"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

export function SearchBar({ initialQuery }: { initialQuery: string }) {
  const [q, setQ] = useState(initialQuery);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const saved = sessionStorage.getItem("anagrafica.q") || "";
    if (!initialQuery && saved) {
      router.replace(`/iscritti?q=${encodeURIComponent(saved)}`);
      return;
    }
    if (initialQuery) sessionStorage.setItem("anagrafica.q", initialQuery);
    else sessionStorage.removeItem("anagrafica.q");
  }, [initialQuery, router]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(() => {
      const value = q.trim();
      if (value) sessionStorage.setItem("anagrafica.q", value);
      else sessionStorage.removeItem("anagrafica.q");
      const params = new URLSearchParams();
      if (value) params.set("q", value);
      router.push(`/iscritti${params.toString() ? `?${params}` : ""}`);
    });
  }

  function clear() {
    setQ("");
    sessionStorage.removeItem("anagrafica.q");
    router.push("/iscritti");
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap gap-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Cerca per nome o cognome..."
        className="w-full max-w-md rounded border px-3 py-2"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded border border-blue-200 bg-white px-4 py-2 text-blue-900 hover:bg-blue-50 disabled:opacity-50"
      >
        Cerca
      </button>
      {initialQuery ? (
        <button
          type="button"
          onClick={clear}
          className="rounded border border-blue-200 px-3 py-2 text-blue-700 hover:bg-blue-50"
        >
          Cancella filtri
        </button>
      ) : null}
    </form>
  );
}
