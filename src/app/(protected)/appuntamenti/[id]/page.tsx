import { notFound } from "next/navigation";
import { getAppuntamento, updateAppuntamentoAction } from "@/app/actions/appuntamenti";
import { listCorsi } from "@/app/actions/corsi";
import { EditAppuntamentoForm } from "./EditForm";

export default async function EditAppuntamentoPage({ params }: { params: { id: string } }) {
  const [row, corsi] = await Promise.all([getAppuntamento(params.id), listCorsi()]);
  if (!row) notFound();
  const action = updateAppuntamentoAction.bind(null, params.id);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Modifica appuntamento</h1>
      <EditAppuntamentoForm action={action} defaultValues={row} corsi={corsi} />
    </div>
  );
}
