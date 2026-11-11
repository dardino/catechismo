import { getPresenzeFilterOptions, listAppuntamentiForCorsoAnno, getPresenzePerAppuntamento } from "@/app/actions/presenze";
import { PresenzeManager } from "./PresenzeManager";

export const dynamic = "force-dynamic";

function getDefaultAppuntamentoId(appuntamenti: { id: string; data: string }[]) {
  if (appuntamenti.length === 0) return "";
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const pastOrToday = appuntamenti.filter((a) => String(a.data).slice(0, 10) <= today);
  if (pastOrToday.length > 0) return pastOrToday[pastOrToday.length - 1].id;
  return appuntamenti[0].id;
}

export default async function PresenzePage({
  searchParams,
}: {
  searchParams: { anni?: string; corsoId?: string; appuntamentoId?: string };
}) {
  const { corsi, anniOptions } = await getPresenzeFilterOptions();
  const anni = searchParams.anni || "";
  const corsoId = searchParams.corsoId || "";
  const appuntamenti = anni && corsoId ? await listAppuntamentiForCorsoAnno(anni, corsoId) : [];
  const selectedId =
    searchParams.appuntamentoId && appuntamenti.some((a) => a.id === searchParams.appuntamentoId)
      ? searchParams.appuntamentoId
      : getDefaultAppuntamentoId(appuntamenti as { id: string; data: string }[]);
  const rows = selectedId ? await getPresenzePerAppuntamento(selectedId) : [];
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Presenze</h1>
      <PresenzeManager
        key={`${anni}|${corsoId}|${selectedId}`}
        corsi={corsi}
        anniOptions={anniOptions}
        selectedAnni={anni}
        selectedCorsoId={corsoId}
        appuntamenti={appuntamenti}
        selectedId={selectedId}
        rows={rows}
      />
    </div>
  );
}
