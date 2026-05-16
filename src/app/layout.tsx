import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'sonner'
import { AppProvider } from '@/components/providers/AppProvider'

export const metadata: Metadata = {
  title: 'Proprely Admin',
  description: 'Tableau de bord administratif pour entreprises de nettoyage',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full">
      <body className="min-h-full bg-slate-50">
        <AppProvider>
          {children}
        </AppProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
