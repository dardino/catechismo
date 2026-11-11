import { createIscrittoAction, getNextCodiceNumerico } from "@/app/actions/iscritti";
import { IscrittoForm } from "@/components/iscritti/IscrittoForm";

export const dynamic = "force-dynamic";

export default async function NuovoIscrittoPage() {
  let nextCodice: number | undefined;
  try {
    nextCodice = await getNextCodiceNumerico();
  } catch {
    nextCodice = undefined;
  }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Nuova scheda anagrafica</h1>
      <IscrittoForm
        action={createIscrittoAction}
        submitLabel="Crea scheda"
        defaultValues={nextCodice ? { codiceNumerico: nextCodice } : undefined}
      />
    </div>
  );
}
