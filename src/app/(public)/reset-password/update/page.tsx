import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import UpdatePasswordForm from './update-password-form'

// Server component : guard the route. The user MUST have an active session
// (created by /auth/callback after they clicked the reset link). If not, we
// bounce them back to /reset-password with an explicit error code that the
// page renders as FR copy.
export default async function UpdatePasswordPage() {
  const supabase = await createServerClient()
  if (!supabase) {
    redirect('/reset-password?error=session-expired')
  }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/reset-password?error=session-expired')
  }
  return <UpdatePasswordForm />
}
