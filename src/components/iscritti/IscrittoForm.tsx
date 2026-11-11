"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { Iscritto } from "@/lib/db/schema";
import { TagInput } from "./TagInput";
import { ParrocchiaAutocomplete } from "./ParrocchiaAutocomplete";
import { useEffect, useState } from "react";

export type IscrittoActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

type Action = (prevState: IscrittoActionState, formData: FormData) => Promise<IscrittoActionState>;

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-red-600">{errors[0]}</p>;
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-blue-900 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-50"
    >
      {pending ? "Salvataggio..." : label}
    </button>
  );
}

function toDateInput(d: string | Date | null | undefined) {
  if (!d) return "";
  const s = typeof d === "string" ? d : d.toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.slice(0, 10);
  }
  return s;
}

export function IscrittoForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: Action;
  defaultValues?: Partial<Iscritto>;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState(action, {});
  const [battezzato, setBattezzato] = useState<boolean>(defaultValues?.battezzato ?? true);
  const fe = state?.fieldErrors || {};

  useEffect(() => {
    if (defaultValues?.battezzato !== undefined) setBattezzato(defaultValues.battezzato);
  }, [defaultValues?.battezzato]);

  const input = "w-full rounded border px-3 py-2";
  const label = "mb-1 block text-sm font-medium";
  const section = "rounded border bg-white p-4 space-y-3";

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      <section className={section}>
        <h2 className="font-semibold">Genitori</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className={label}>Cognome Padre *</label><input name="cognomePadre" defaultValue={defaultValues?.cognomePadre || ""} className={input} required /><FieldError errors={fe.cognomePadre} /></div>
          <div><label className={label}>Nome Padre *</label><input name="nomePadre" defaultValue={defaultValues?.nomePadre || ""} className={input} required /><FieldError errors={fe.nomePadre} /></div>
          <div><label className={label}>Cognome Madre *</label><input name="cognomeMadre" defaultValue={defaultValues?.cognomeMadre || ""} className={input} required /><FieldError errors={fe.cognomeMadre} /></div>
          <div><label className={label}>Nome Madre *</label><input name="nomeMadre" defaultValue={defaultValues?.nomeMadre || ""} className={input} required /><FieldError errors={fe.nomeMadre} /></div>
        </div>
      </section>

      <section className={section}>
        <h2 className="font-semibold">Dati iscritto</h2>
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div><label className={label}>Codice numerico *</label><input name="codiceNumerico" type="number" min={1} step={1} defaultValue={defaultValues?.codiceNumerico ?? ""} className={input} required /><FieldError errors={fe.codiceNumerico} /></div>
            <div><label className={label}>Cognome iscritto *</label><input name="cognomeIscritto" defaultValue={defaultValues?.cognomeIscritto || ""} className={input} required /><FieldError errors={fe.cognomeIscritto} /></div>
            <div><label className={label}>Nome iscritto *</label><input name="nomeIscritto" defaultValue={defaultValues?.nomeIscritto || ""} className={input} required /><FieldError errors={fe.nomeIscritto} /></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className={label}>Nato a (Comune) *</label><input name="natoA" defaultValue={defaultValues?.natoA || ""} className={input} required /><FieldError errors={fe.natoA} /></div>
            <div><label className={label}>Data di nascita *</label><input name="dataNascita" type="date" defaultValue={toDateInput(defaultValues?.dataNascita as unknown as string)} className={input} required /><FieldError errors={fe.dataNascita} /></div>
            <div><label className={label}>Residente a (Comune) *</label><input name="residenteA" defaultValue={defaultValues?.residenteA || ""} className={input} required /><FieldError errors={fe.residenteA} /></div>
            <div><label className={label}>In via *</label><input name="indirizzoVia" defaultValue={defaultValues?.indirizzoVia || ""} className={input} required /><FieldError errors={fe.indirizzoVia} /></div>
          </div>
        </div>
      </section>

      <section className={section}>
        <h2 className="font-semibold">Battesimo</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-2 pt-6">
            <input id="battezzato" name="battezzato" type="checkbox" checked={battezzato} onChange={(e) => setBattezzato(e.target.checked)} />
            <label htmlFor="battezzato" className="text-sm font-medium">Battezzato</label>
          </div>
          <div>
            <ParrocchiaAutocomplete
              name="parrocchiaBattesimo"
              battezzato={battezzato}
              defaultValue={defaultValues?.parrocchiaBattesimo}
              error={fe.parrocchiaBattesimo?.[0]}
            />
          </div>
        </div>
      </section>

      <section className={section}>
        <h2 className="font-semibold">Contatti</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className={label}>Cellulare Genitore *</label><input name="cellulareGenitore" defaultValue={defaultValues?.cellulareGenitore || ""} className={input} required /><FieldError errors={fe.cellulareGenitore} /></div>
          <div><label className={label}>Telefono di reperibilità (urgenze) *</label><input name="telefonoUrgenze" defaultValue={defaultValues?.telefonoUrgenze || ""} className={input} required /><FieldError errors={fe.telefonoUrgenze} /></div>
          <div><label className={label}>E-Mail *</label><input name="email" type="email" defaultValue={defaultValues?.email || ""} className={input} required /><FieldError errors={fe.email} /></div>
          <div><label className={label}>Codice Fiscale (facoltativo)</label><input name="codiceFiscale" defaultValue={defaultValues?.codiceFiscale || ""} className={input} /><FieldError errors={fe.codiceFiscale} /></div>
        </div>
      </section>

      <section className={section}>
        <h2 className="font-semibold">Scuola e consenso</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className={label}>Classe Scolastica *</label><input name="classeScolastica" defaultValue={defaultValues?.classeScolastica || ""} className={input} required /><FieldError errors={fe.classeScolastica} /></div>
          <div><label className={label}>Plesso Scolastico *</label><input name="plessoScolastico" defaultValue={defaultValues?.plessoScolastico || ""} className={input} required /><FieldError errors={fe.plessoScolastico} /></div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <input id="consensoFotoVideo" name="consensoFotoVideo" type="checkbox" defaultChecked={defaultValues?.consensoFotoVideo ?? false} />
            <label htmlFor="consensoFotoVideo" className="text-sm font-medium">Consenso trattamento foto e video *</label>
            <FieldError errors={fe.consensoFotoVideo} />
          </div>
        </div>
      </section>

      <section className={section}>
        <h2 className="font-semibold">Salute e note</h2>
        <div className="grid gap-3">
          <TagInput name="patologie" label="Patologie" defaultValues={(defaultValues?.patologie as string[]) || []} />
          <TagInput name="allergieIntolleranze" label="Allergie/Intolleranze" defaultValues={(defaultValues?.allergieIntolleranze as string[]) || []} />
          <div>
            <label className={label}>Altro</label>
            <textarea name="altro" defaultValue={defaultValues?.altro || ""} className={input} rows={3} />
            <FieldError errors={fe.altro} />
          </div>
        </div>
      </section>

      <section className={section}>
        <h2 className="font-semibold">Amministrazione</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-2 pt-6">
            <input id="libroConsegnato" name="libroConsegnato" type="checkbox" defaultChecked={defaultValues?.libroConsegnato ?? false} />
            <label htmlFor="libroConsegnato" className="text-sm font-medium">Libro consegnato</label>
          </div>
          <div>
            <label className={label}>Quota versata (€) *</label>
            <input name="quotaVersata" defaultValue={defaultValues?.quotaVersata != null ? String(defaultValues.quotaVersata).replace(".", ",") : ""} placeholder="20,00" className={input} required />
            <FieldError errors={fe.quotaVersata} />
          </div>
          <div>
            <label className={label}>Metodo di pagamento *</label>
            <select name="metodoPagamento" defaultValue={(defaultValues?.metodoPagamento as string) || "CONTANTI"} className={input} required>
              <option value="CONTANTI">CONTANTI</option>
              <option value="POS">POS</option>
            </select>
            <FieldError errors={fe.metodoPagamento} />
          </div>
        </div>
      </section>

      <div className="flex gap-2">
        <Submit label={submitLabel} />
        <a href="/iscritti" className="rounded border border-blue-200 px-4 py-2 text-blue-900 hover:bg-blue-50">Annulla</a>
      </div>
    </form>
  );
}
