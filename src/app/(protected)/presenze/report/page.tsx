import { getReportPresenze, getPresenzeFilterOptions } from "@/app/actions/presenze";
import { PrintButton } from "./PrintButton";
import { ReportFilters } from "./ReportFilters";

export const dynamic = "force-dynamic";

const MESI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

function fmtDate(d: string) {
  const [y, m, day] = String(d).split("-");
  if (!y || !m || !day) return d;
  const mi = Number(m) - 1;
  const mese = MESI[mi] || m;
  return `${day} ${mese} ${y}`;
}

export default async function PresenzeReportPage({
  searchParams,
}: {
  searchParams: { anni?: string; corsoId?: string };
}) {
  const [{ appuntamenti, iscritti, presentiSetKeys }, { corsi, anniOptions }] = await Promise.all([
    getReportPresenze({ anni: searchParams.anni, corsoId: searchParams.corsoId }),
    getPresenzeFilterOptions(),
  ]);
  const presenti = new Set(presentiSetKeys);
  const selectedAnni = searchParams.anni || "";
  const selectedCorsoId = searchParams.corsoId || "";
  const backHref = selectedAnni && selectedCorsoId ? `/presenze?anni=${encodeURIComponent(selectedAnni)}&corsoId=${encodeURIComponent(selectedCorsoId)}` : "/presenze";

  return (
    <div className="space-y-4 print:space-y-2 print-report-root">
      <div className="flex items-center justify-between no-print">
        <h1 className="text-2xl font-semibold">Report presenze</h1>
        <div className="flex gap-2">
          <a href={backHref} className="rounded border border-blue-200 px-3 py-1.5 text-sm text-blue-900 hover:bg-blue-50">Torna alle presenze</a>
        </div>
      </div>

      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <ReportFilters
          corsi={corsi}
          anniOptions={anniOptions}
          selectedAnni={selectedAnni}
          selectedCorsoId={selectedCorsoId}
        />
        <PrintButton />
      </div>

      <h1 className="hidden print:block text-base font-semibold">Report presenze{selectedAnni ? ` - ${selectedAnni}` : ""}</h1>

      {!selectedAnni || !selectedCorsoId ? (
        <div className="rounded border border-blue-100 bg-white p-6 text-blue-700">Seleziona anno e corso per visualizzare il report.</div>
      ) : iscritti.length === 0 || appuntamenti.length === 0 ? (
        <div className="rounded border border-blue-100 bg-white p-6 text-blue-700">
          Nessun dato per il filtro selezionato (servono iscrizioni e appuntamenti per anno/corso).
        </div>
      ) : (
        <div className="overflow-auto rounded border border-blue-100 bg-white print:overflow-visible print:border-0 print-fit">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 border-b border-r bg-blue-100 px-2 py-2 text-left text-blue-950 whitespace-nowrap w-px">Codice</th>
                <th className="border-b border-r bg-blue-100 px-3 py-2 text-left text-blue-950">Nome e Cognome</th>
                <th className="border-b border-r bg-blue-100 px-3 py-2 text-left text-blue-950">Classe</th>
                {appuntamenti.map((a) => (
                  <th key={a.id} className="w-[2em] min-w-[2em] max-w-[2em] border-b border-r bg-blue-100 px-0 py-2 align-bottom text-blue-950">
                    <div className="flex h-20 items-end justify-center print-date-header">
                      <span className="whitespace-nowrap text-xs font-medium [writing-mode:vertical-rl] rotate-180">
                        {fmtDate(a.data as unknown as string)}
                      </span>
                    </div>
                  </th>
                ))}
                <th className="w-[3em] border-b bg-blue-100 px-1 py-2 text-blue-950">Tot.</th>
              </tr>
            </thead>
            <tbody>
              {iscritti.map((i) => {
                let tot = 0;
                return (
                  <tr key={i.id} className="border-t">
                    <td className="sticky left-0 z-10 border-r bg-white px-2 py-1.5 font-medium whitespace-nowrap w-px">{i.codiceNumerico}</td>
                    <td className="border-r bg-white px-3 py-1.5">{i.nomeIscritto} {i.cognomeIscritto}</td>
                    <td className="border-r bg-white px-3 py-1.5">{i.insegnanteNome}</td>
                    {appuntamenti.map((a) => {
                      const ok = presenti.has(`${a.id}:${i.id}`);
                      if (ok) tot += 1;
                      return (
                        <td key={a.id} className={`w-[2em] min-w-[2em] max-w-[2em] border-r px-0 py-1.5 text-center ${ok ? "bg-green-50 text-green-700 font-semibold" : "text-slate-300"}`}>
                          {ok ? "✓" : "·"}
                        </td>
                      );
                    })}
                    <td className="w-[3em] px-1 py-1.5 text-center font-medium">{tot}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
