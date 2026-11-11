"use client";

import { useEffect, useRef, useState } from "react";

export function ParrocchiaAutocomplete({
  name,
  defaultValue,
  battezzato,
  error,
}: {
  name: string;
  defaultValue?: string;
  battezzato: boolean;
  error?: string;
}) {
  const [value, setValue] = useState(
    defaultValue || (battezzato ? "" : "N/D"),
  );
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!battezzato) {
      setValue("N/D");
      setSuggestions([]);
      setOpen(false);
    } else if (value === "N/D") {
      setValue("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battezzato]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!battezzato) return;
    const q = value.trim();
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      try {
        const res = await fetch(`/api/geocode/parrocchia?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error("fetch failed");
        const data = (await res.json()) as { suggestions?: string[] };
        setSuggestions(data.suggestions || []);
        setOpen(true);
      } catch (e: unknown) {
        if (!(e instanceof DOMException && e.name === "AbortError")) setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [value, battezzato]);

  const inputClass = `w-full rounded border px-3 py-2 ${!battezzato ? "bg-blue-50" : ""}`;

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1 block text-sm font-medium">
        Parrocchia di battesimo (ubicazione completa) *
      </label>
      <input
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => battezzato && suggestions.length > 0 && setOpen(true)}
        readOnly={!battezzato}
        required
        autoComplete="off"
        className={inputClass}
        placeholder={battezzato ? "Cerca parrocchia (es. Parrocchia di..., Città)" : "N/D"}
      />
      {battezzato && loading ? (
        <p className="mt-1 text-xs text-blue-700">Ricerca suggerimenti...</p>
      ) : null}
      {battezzato && open && suggestions.length > 0 ? (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded border border-blue-200 bg-white shadow">
          {suggestions.map((s) => (
            <li key={s}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-blue-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setValue(s);
                  setOpen(false);
                  setSuggestions([]);
                }}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {battezzato ? (
        <p className="mt-1 text-xs text-blue-700">
          Puoi scegliere un suggerimento o inserire manualmente l&apos;ubicazione completa.
        </p>
      ) : (
        <p className="mt-1 text-xs text-blue-700">Valore impostato a N/D per i non battezzati.</p>
      )}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
