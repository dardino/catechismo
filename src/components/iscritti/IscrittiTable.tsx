import Link from "next/link";
import type { Iscritto } from "@/lib/db/schema";
import { DeleteIscrittoButton } from "./DeleteIscrittoButton";
import { ToggleNascostoButton } from "./ToggleNascostoButton";

function fmtDate(d: string | null) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  if (!y || !m || !day) return d;
  return `${day}/${m}/${y}`;
}

export function IscrittiTable({ rows }: { rows: Iscritto[] }) {
  if (rows.length === 0) {
    return <div className="rounded border border-blue-100 bg-white p-6 text-blue-700">Nessuna scheda trovata.</div>;
  }
  return (
    <div className="overflow-x-auto rounded border border-blue-100 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-blue-100 text-left text-blue-950">
          <tr>
            <th className="px-3 py-2">Codice</th>
            <th className="px-3 py-2">Iscritto</th>
            <th className="px-3 py-2">Nascita</th>
            <th className="px-3 py-2">Classe/Plesso</th>
            <th className="px-3 py-2">Contatti</th>
            <th className="px-3 py-2">Libro</th>
            <th className="px-3 py-2">Quota</th>
            <th className="px-3 py-2">Azioni</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={`border-t align-top ${r.nascosto ? "opacity-50" : ""}`}>
              <td className="px-3 py-2 font-medium text-blue-900">{r.codiceNumerico}</td>
              <td className="px-3 py-2">
                <div className="font-medium">{r.cognomeIscritto} {r.nomeIscritto}</div>
                <div className="text-xs text-blue-700">Consenso foto: {r.consensoFotoVideo ? "Sì" : "No"}</div>
              </td>
              <td className="px-3 py-2">{fmtDate(r.dataNascita as unknown as string)}<div className="text-xs text-blue-700">{r.natoA}</div></td>
              <td className="px-3 py-2">{r.classeScolastica}<div className="text-xs text-blue-700">{r.plessoScolastico}</div></td>
              <td className="px-3 py-2">
                <div>{r.cellulareGenitore}</div>
                <div className="text-xs text-blue-700">{r.email}</div>
              </td>
              <td className="px-3 py-2">{r.libroConsegnato ? "Sì" : "No"}</td>
              <td className="px-3 py-2">€ {String(r.quotaVersata)}<div className="text-xs text-blue-700">{r.metodoPagamento}</div></td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <ToggleNascostoButton id={r.id} nascosto={r.nascosto} />
                  <Link href={`/iscritti/${r.id}`} className="inline-flex items-center text-blue-900 hover:text-blue-700" title="Modifica" aria-label="Modifica">
                    <span className="material-symbols-outlined text-[20px]">edit</span>
                  </Link>
                  <DeleteIscrittoButton id={r.id} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
