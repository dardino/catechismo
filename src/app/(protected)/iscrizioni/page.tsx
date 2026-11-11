import { getIscrizioniPageData } from "@/app/actions/iscrizioni";
import { IscrizioniManager } from "./IscrizioniManager";

export const dynamic = "force-dynamic";

export default async function IscrizioniPage({
  searchParams,
}: {
  searchParams: { anni?: string; corsoId?: string };
}) {
  const data = await getIscrizioniPageData({
    anni: searchParams.anni || undefined,
    corsoId: searchParams.corsoId || undefined,
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Iscrizioni</h1>
      <IscrizioniManager
        initialRows={data.rows}
        corsi={data.corsi}
        iscritti={data.iscritti}
        anniOptions={data.anniOptions}
        annoCorrente={data.annoCorrente}
        selectedAnni={searchParams.anni || ""}
        selectedCorsoId={searchParams.corsoId || ""}
        insegnanti={data.insegnanti}
      />
    </div>
  );
}
