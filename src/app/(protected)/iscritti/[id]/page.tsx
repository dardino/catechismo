import { notFound } from "next/navigation";
import { getIscritto, updateIscrittoAction } from "@/app/actions/iscritti";
import { IscrittoForm } from "@/components/iscritti/IscrittoForm";

export default async function ModificaIscrittoPage({ params }: { params: { id: string } }) {
  const iscritto = await getIscritto(params.id);
  if (!iscritto) notFound();
  const action = updateIscrittoAction.bind(null, params.id);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Modifica scheda anagrafica</h1>
      <IscrittoForm action={action} defaultValues={iscritto} submitLabel="Salva modifiche" />
    </div>
  );
}
