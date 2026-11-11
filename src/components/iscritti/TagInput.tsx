"use client";

import { useState } from "react";

export function TagInput({
  name,
  label,
  defaultValues = [],
}: {
  name: string;
  label: string;
  defaultValues?: string[];
}) {
  const [tags, setTags] = useState<string[]>(defaultValues);
  const [value, setValue] = useState("");

  function addTag() {
    const v = value.trim();
    if (!v) return;
    if (!tags.includes(v)) setTags([...tags, v]);
    setValue("");
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          className="w-full rounded border px-3 py-2"
          placeholder="Scrivi e premi Aggiungi"
        />
        <button type="button" onClick={addTag} className="rounded border border-blue-200 px-3 py-2 text-blue-900 hover:bg-blue-50">
          Aggiungi
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-1 text-sm text-blue-950">
            {t}
            <button
              type="button"
              onClick={() => setTags(tags.filter((x) => x !== t))}
              className="text-blue-700 hover:text-blue-950"
            >
              ×
            </button>
            <input type="hidden" name={name} value={t} />
          </span>
        ))}
        {tags.length === 0 ? <span className="text-xs text-blue-700">Nessuna voce</span> : null}
      </div>
    </div>
  );
}
