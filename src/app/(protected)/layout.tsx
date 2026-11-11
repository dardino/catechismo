import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
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
            <Link href="/configurazione" className="rounded px-2 py-1 hover:bg-blue-900">Configurazione</Link>
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
