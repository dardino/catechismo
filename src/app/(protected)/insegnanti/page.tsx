import Link from "next/link";
import { listInsegnanti } from "@/app/actions/insegnanti";
import { DeleteButton } from "./DeleteButton";

export const dynamic = "force-dynamic";

export default async function InsegnantiPage() {
  const rows = await listInsegnanti();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Insegnanti</h1>
        <Link href="/insegnanti/nuovo" className="rounded bg-blue-900 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">Nuovo</Link>
      </div>
      <div className="overflow-x-auto rounded border border-blue-100 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-blue-100 text-left text-blue-950"><tr><th className="px-3 py-2">ID</th><th className="px-3 py-2">Nome</th><th className="px-3 py-2">Azioni</th></tr></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={3} className="px-3 py-6 text-center text-blue-700">Nessun insegnante.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2 font-mono text-xs text-blue-900">{r.id}</td>
                <td className="px-3 py-2">{r.nome}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Link href={`/insegnanti/${r.id}`} className="text-blue-900 hover:text-blue-700" title="Modifica"><span className="material-symbols-outlined text-[20px]">edit</span></Link>
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
