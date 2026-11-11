import { notFound } from "next/navigation";
import { getInsegnante, updateInsegnanteAction } from "@/app/actions/insegnanti";
import { EditInsegnanteForm } from "./EditForm";

export default async function EditInsegnantePage({ params }: { params: { id: string } }) {
  const row = await getInsegnante(params.id);
  if (!row) notFound();
  const action = updateInsegnanteAction.bind(null, params.id);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Modifica insegnante</h1>
      <EditInsegnanteForm action={action} defaultValues={row} />
    </div>
  );
}
