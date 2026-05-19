import Link from 'next/link'
import { SUPPORT_EMAIL } from '@/lib/constants'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white">
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-200/60">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-xl font-semibold tracking-tight text-slate-900">Proprely</span>
          <span className="text-[10px] uppercase tracking-wider text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">Beta</span>
        </Link>
        <nav className="flex items-center gap-5 text-sm text-slate-600">
          <Link href="/login" className="hover:text-slate-900 transition">Connexion</Link>
          <Link
            href="/signup"
            className="px-3 py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800 transition"
          >
            Créer un compte
          </Link>
        </nav>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        {children}
      </main>
      <footer className="px-6 py-5 border-t border-slate-200/60 text-xs text-slate-500 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        <Link href="/cgu" className="hover:text-slate-700">Conditions générales</Link>
        <Link href="/confidentialite" className="hover:text-slate-700">Politique de confidentialité</Link>
        <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-slate-700">
          Contact
        </a>
        <span>© {new Date().getFullYear()} Proprely</span>
      </footer>
    </div>
  )
}
