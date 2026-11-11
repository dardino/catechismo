import { getAppuntamentoFormData } from "@/app/actions/appuntamenti";
import { getAnnoScolasticoCorrente } from "@/lib/anno-scolastico";
import { NuovoAppuntamentoForm } from "./NuovoAppuntamentoForm";

export const dynamic = "force-dynamic";

export default async function NuovoAppuntamentoPage() {
  const { corsi, ultimo } = await getAppuntamentoFormData();
  const defaultOra = ultimo?.ora ? String(ultimo.ora).slice(0, 5) : "";
  const defaultOraFine = ultimo?.oraFine ? String(ultimo.oraFine).slice(0, 5) : "";
  const defaultAnni = ultimo?.anni || getAnnoScolasticoCorrente();
  const defaultCorsoId = ultimo?.corsoId || "";
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Nuovo appuntamento</h1>
      <NuovoAppuntamentoForm
        corsi={corsi}
        defaultOra={defaultOra}
        defaultOraFine={defaultOraFine}
        defaultAnni={defaultAnni}
        defaultCorsoId={defaultCorsoId}
      />
    </div>
  );
}
