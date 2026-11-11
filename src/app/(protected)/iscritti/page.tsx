import Link from "next/link";
import { listIscritti } from "@/app/actions/iscritti";
import { IscrittiTable } from "@/components/iscritti/IscrittiTable";
import { SearchBar } from "@/components/iscritti/SearchBar";
import { ImportIscrittiCsv } from "@/components/iscritti/ImportIscrittiCsv";

export const dynamic = "force-dynamic";

export default async function IscrittiPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams.q || "";
  const rows = await listIscritti(q);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Anagrafica</h1>
          <p className="text-sm text-blue-700">{rows.length} risultati</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ImportIscrittiCsv />
          <a
            href="/api/iscritti/export"
            className="rounded border border-blue-200 bg-white px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-50"
          >
            Esporta CSV
          </a>
          <Link
            href="/iscritti/nuovo"
            className="rounded bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
          >
            Nuova scheda
          </Link>
        </div>
      </div>
      <SearchBar initialQuery={q} />
      <IscrittiTable rows={rows} />
    </div>
  );
}
