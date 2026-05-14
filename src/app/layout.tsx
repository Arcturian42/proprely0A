import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'sonner'
import { QueryProvider } from '@/components/providers/QueryProvider'

export const metadata: Metadata = {
  title: 'Proprely Admin',
  description: 'Tableau de bord administratif pour entreprises de nettoyage',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full">
      <body className="min-h-full bg-slate-50">
        <QueryProvider>
          {children}
          <Toaster position="top-right" richColors />
        </QueryProvider>
      </body>
    </html>
  )
}
