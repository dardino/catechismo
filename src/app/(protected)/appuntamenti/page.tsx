import Link from "next/link";
import { getAppuntamentiFilterOptions, listAppuntamenti } from "@/app/actions/appuntamenti";
import { DeleteButton } from "./DeleteButton";
import { AppuntamentiFilters } from "./AppuntamentiFilters";

export const dynamic = "force-dynamic";

function fmtDate(d: string) {
  const [y, m, day] = d.split("-");
  return y && m && day ? `${day}/${m}/${y}` : d;
}

export default async function AppuntamentiPage({
  searchParams,
}: {
  searchParams: { anni?: string; corsoId?: string };
}) {
  const selectedAnni = searchParams.anni || "";
  const selectedCorsoId = searchParams.corsoId || "";
  const [{ corsi, anniOptions }, rows] = await Promise.all([
    getAppuntamentiFilterOptions(),
    listAppuntamenti({
      anni: selectedAnni || undefined,
      corsoId: selectedCorsoId || undefined,
    }),
  ]);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Appuntamenti</h1>
        <Link href="/appuntamenti/nuovo" className="rounded bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">Nuovo</Link>
      </div>
      <AppuntamentiFilters
        corsi={corsi}
        anniOptions={anniOptions}
        selectedAnni={selectedAnni}
        selectedCorsoId={selectedCorsoId}
      />
      <div className="overflow-x-auto rounded border border-blue-100 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-blue-100 text-left text-blue-950"><tr><th className="px-3 py-2">Data</th><th className="px-3 py-2">Dalle</th><th className="px-3 py-2">Alle</th><th className="px-3 py-2">Anno</th><th className="px-3 py-2">Corso</th><th className="px-3 py-2">Azioni</th></tr></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-blue-700">Nessun appuntamento.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{fmtDate(r.data as unknown as string)}</td>
                <td className="px-3 py-2">{String(r.ora).slice(0,5)}</td>
                <td className="px-3 py-2">{r.oraFine ? String(r.oraFine).slice(0,5) : "-"}</td>
                <td className="px-3 py-2">{r.anni}</td>
                <td className="px-3 py-2">{r.corsoNome}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Link href={`/appuntamenti/${r.id}`} className="text-blue-900 hover:text-blue-700" title="Modifica"><span className="material-symbols-outlined text-[20px]">edit</span></Link>
                    <DeleteButton id={r.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
