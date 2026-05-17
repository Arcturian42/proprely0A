import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/lib/auth'
import type { CurrentUser, Role, TenantCompany } from '@/lib/auth/types'
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { loadCompanyData } from '@/app/actions/data'
import { SupabaseHydrator } from '@/components/auth/SupabaseHydrator'

export const metadata: Metadata = {
  title: 'Proprely',
  description: 'Tableau de bord pour entreprises de propreté',
}

async function loadInitialAuth(): Promise<{ user?: CurrentUser; companies?: TenantCompany[] }> {
  if (!isSupabaseConfigured()) return {}
  const supabase = await createServerClient()
  if (!supabase) return {}

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return {}

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, company_id, role, first_name, last_name')
    .eq('id', user.id)
    .single()
  if (!profile) return {}

  const { data: company } = await supabase
    .from('companies')
    .select('id, name')
    .eq('id', profile.company_id)
    .single()
  if (!company) return {}

  return {
    user: {
      id: profile.id,
      email: user.email ?? '',
      first_name: profile.first_name ?? '',
      last_name: profile.last_name ?? '',
      role: profile.role as Role,
      company_id: profile.company_id,
    },
    companies: [{ id: company.id, name: company.name }],
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { user, companies } = await loadInitialAuth()
  // Pre-fetch tenant data on the server so the Zustand store can hydrate
  // synchronously at mount, avoiding mock-data flash for authenticated users.
  const snapshot = user ? await loadCompanyData() : null

  return (
    <html lang="fr" className="h-full">
      <body className="min-h-full bg-slate-50">
        <AuthProvider initialUser={user} initialCompanies={companies}>
          <SupabaseHydrator snapshot={snapshot} />
          {children}
        </AuthProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
