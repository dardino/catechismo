import { getClassiFilterOptions, listClassi, listIscrittiOptionsForAnnoCorso, listInsegnantiOptions } from "@/app/actions/classi";
import { ClassiManager } from "./ClassiManager";

export const dynamic = "force-dynamic";

export default async function ClassiPage({
  searchParams,
}: {
  searchParams: { anni?: string; corsoId?: string };
}) {
  const anni = searchParams.anni || "";
  const corsoId = searchParams.corsoId || "";
  const [{ corsi, anniOptions }, rows, iscritti, insegnanti] = await Promise.all([
    getClassiFilterOptions(),
    listClassi({ anni, corsoId }),
    listIscrittiOptionsForAnnoCorso(anni, corsoId),
    listInsegnantiOptions(),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Classi (abbinamento iscritto - insegnante)</h1>
      <ClassiManager
        corsi={corsi}
        anniOptions={anniOptions}
        selectedAnni={anni}
        selectedCorsoId={corsoId}
        rows={rows}
        iscritti={iscritti}
        insegnanti={insegnanti}
      />
    </div>
  );
}
