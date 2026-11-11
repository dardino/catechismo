import { getDbConfigAction } from "@/app/actions/config";
import { listCorsi } from "@/app/actions/corsi";
import { ConfigurazioneForm } from "./ConfigurazioneForm";
import { CorsiManager } from "./CorsiManager";

export const dynamic = "force-dynamic";

export default async function ConfigurazionePage() {
  const [config, corsi] = await Promise.all([getDbConfigAction(), listCorsi()]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Configurazione</h1>
      <p className="text-sm text-blue-700">
        Imposta la connessione al database e le impostazioni applicative.
      </p>
      <ConfigurazioneForm initialConfig={config} />
      <CorsiManager initialCorsi={corsi} />
    </div>
  );
}
