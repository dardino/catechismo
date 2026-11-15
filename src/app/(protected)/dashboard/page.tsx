import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { getDashboardData } from "@/app/actions/dashboard";

export const dynamic = "force-dynamic";

function fmtDate(d: string) {
  const [y, m, day] = String(d).split("-");
  return y && m && day ? `${day}/${m}/${y}` : d;
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  href,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  href?: string;
}) {
  const body = (
    <div className="flex h-full items-start gap-4 rounded-xl border border-blue-100 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-900">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div>
        <p className="text-sm font-medium text-blue-700">{title}</p>
        <p className="text-2xl font-semibold text-blue-950">{value}</p>
        {subtitle ? <p className="mt-1 text-xs text-blue-700">{subtitle}</p> : null}
      </div>
    </div>
  );
  return href ? <Link href={href} className="block">{body}</Link> : body;
}

function QuickLink({ href, title, desc, icon }: { href: string; title: string; desc: string; icon: string }) {
  return (
    <Link href={href} className="group flex items-start gap-3 rounded-lg border border-blue-100 bg-white p-4 hover:border-blue-300 hover:bg-blue-50">
      <span className="material-symbols-outlined text-blue-800">{icon}</span>
      <div>
        <p className="font-medium text-blue-950 group-hover:text-blue-900">{title}</p>
        <p className="text-sm text-blue-700">{desc}</p>
      </div>
    </Link>
  );
}

export default async function DashboardPage() {
  const [user, data] = await Promise.all([getCurrentUser(), getDashboardData()]);
  const name = user?.username || "utente";
  const { stats, prossimiAppuntamenti, annoCorrente } = data;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950 via-blue-900 to-blue-700 p-6 text-white shadow">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-12 left-20 h-40 w-40 rounded-full bg-cyan-300/10 blur-2xl" />
        <div className="relative">
          <p className="text-sm text-blue-100">Benvenuto/a, {name}</p>
          <h1 className="mt-1 text-3xl font-semibold">Dashboard Catechismo</h1>
          <p className="mt-2 max-w-2xl text-sm text-blue-100">
            Panoramica dell&apos;anno <strong>{annoCorrente}</strong>: anagrafica, iscrizioni, appuntamenti e attività in un colpo d&apos;occhio.
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Iscritti attivi" value={stats.iscrittiAttivi} subtitle={`${stats.iscrittiTotali} totali in anagrafica`} icon="groups" href="/iscritti" />
        <StatCard title="Iscrizioni anno corrente" value={stats.iscrizioniAnnoCorrente} subtitle={`Anno ${annoCorrente}`} icon="how_to_reg" href="/iscrizioni" />
        <StatCard title="Appuntamenti" value={stats.appuntamentiTotali} subtitle={`${prossimiAppuntamenti.length} in programma`} icon="event" href="/appuntamenti" />
        <StatCard title="Insegnanti" value={stats.insegnanti} subtitle="Registrati" icon="school" href="/insegnanti" />
        <StatCard title="Corsi" value={stats.corsi} subtitle="Configurati" icon="menu_book" href={user?.role === "admin" ? "/configurazione" : "/iscrizioni"} />
        <StatCard title="Presenze" value="Registro" subtitle="Consulta e registra le presenze" icon="fact_check" href="/presenze" />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-blue-950">Prossimi appuntamenti</h2>
            <Link href="/appuntamenti" className="text-sm text-blue-800 hover:underline">Vedi tutti</Link>
          </div>
          {prossimiAppuntamenti.length === 0 ? (
            <p className="text-sm text-blue-700">Nessun appuntamento in programma.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-blue-100 text-left text-blue-950">
                  <tr>
                    <th className="px-3 py-2">Data</th>
                    <th className="px-3 py-2">Ora</th>
                    <th className="px-3 py-2">Anno</th>
                    <th className="px-3 py-2">Corso</th>
                  </tr>
                </thead>
                <tbody>
                  {prossimiAppuntamenti.map((a) => (
                    <tr key={a.id} className="border-t">
                      <td className="px-3 py-2 font-medium">{fmtDate(a.data as unknown as string)}</td>
                      <td className="px-3 py-2">{String(a.ora).slice(0, 5)}{a.oraFine ? ` - ${String(a.oraFine).slice(0, 5)}` : ""}</td>
                      <td className="px-3 py-2">{a.anni}</td>
                      <td className="px-3 py-2">{a.corsoNome}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-blue-950">Azioni rapide</h2>
          <div className="grid gap-3">
            <QuickLink href="/iscritti" title="Anagrafica" desc="Gestisci le schede dei ragazzi" icon="badge" />
            <QuickLink href="/iscrizioni" title="Iscrizioni" desc="Iscrizioni annuali e corsi" icon="playlist_add_check" />
            <QuickLink href="/presenze" title="Presenze" desc="Registra e consulta presenze" icon="checklist" />
            <QuickLink href="/classi" title="Classi" desc="Abbinamenti e generazione classi" icon="groups_2" />
            {user?.role === "admin" ? (
              <QuickLink href="/configurazione" title="Configurazione" desc="Database, corsi e utenti" icon="settings" />
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
