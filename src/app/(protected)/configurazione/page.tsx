import { redirect } from "next/navigation";
import { getDbConfigAction } from "@/app/actions/config";
import { listCorsi } from "@/app/actions/corsi";
import { getCurrentUser } from "@/lib/auth/session";
import { listUsersAction } from "@/app/actions/users";
import { ConfigurazioneForm } from "./ConfigurazioneForm";
import { CorsiManager } from "./CorsiManager";
import { UsersManager } from "./UsersManager";

export const dynamic = "force-dynamic";

export default async function ConfigurazionePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/iscritti");
  const [config, corsi, users] = await Promise.all([getDbConfigAction(), listCorsi(), listUsersAction()]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Configurazione</h1>
      <p className="text-sm text-blue-700">
        Imposta la connessione al database e le impostazioni applicative.
      </p>
      <UsersManager initialUsers={users} currentUserId={user.id} />
      <ConfigurazioneForm initialConfig={config} />
      <CorsiManager initialCorsi={corsi} />
    </div>
  );
}
