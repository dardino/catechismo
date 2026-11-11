import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth/session";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/cambia-password");

  return (
    <div className="min-h-screen">
      <header className="bg-blue-950 text-white shadow">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <Link href="/iscritti" className="text-lg font-semibold text-white">
            Catechismo
          </Link>
          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <Link href="/iscrizioni" className="rounded px-2 py-1 hover:bg-blue-900">Iscrizioni</Link>
            <Link href="/appuntamenti" className="rounded px-2 py-1 hover:bg-blue-900">Appuntamenti</Link>
            <Link href="/insegnanti" className="rounded px-2 py-1 hover:bg-blue-900">Insegnanti</Link>
            <Link href="/classi" className="rounded px-2 py-1 hover:bg-blue-900">Classi</Link>
            <Link href="/presenze" className="rounded px-2 py-1 hover:bg-blue-900">Presenze</Link>
            <Link href="/iscritti" className="rounded px-2 py-1 hover:bg-blue-900">Anagrafica</Link>
            {user.role === "admin" ? (
              <Link href="/configurazione" className="rounded px-2 py-1 hover:bg-blue-900">Configurazione</Link>
            ) : null}
            <span className="px-2 py-1 text-blue-200" title={user.role}>
              {user.username} ({user.role === "admin" ? "admin" : user.role === "viewer" ? "lettura" : "standard"})
            </span>
            <form action={logoutAction}>
              <button className="rounded border border-blue-300/40 bg-blue-900 px-3 py-1.5 text-white hover:bg-blue-800">Esci</button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4">{children}</main>
    </div>
  );
}
