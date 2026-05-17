import { redirect } from 'next/navigation'
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { AgentShell } from './_components/AgentShell'

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  // Real-mode role guard: only `agent` can access /agent/*. Others are bounced
  // to /dashboard. In dummy mode (Supabase not configured), no check happens —
  // the dev CompanySwitcher lets you test agent UI freely.
  if (isSupabaseConfigured()) {
    const supabase = await createServerClient()
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        redirect('/login')
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      if (profile && profile.role !== 'agent') {
        redirect('/dashboard')
      }
    }
  }

  return <AgentShell>{children}</AgentShell>
}
