import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Called when a logged-in user has no users row (e.g. signed up before the trigger was in place)
export async function POST() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  // Check if users row already exists
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single()

  if (existing) return NextResponse.json({ ok: true, already: true })

  // Get company_id from metadata, or create a new company
  let companyId = user.user_metadata?.company_id as string | undefined

  if (!companyId) {
    const companyName = user.user_metadata?.company_name as string | undefined ?? user.email ?? 'Mon Entreprise'
    const { data: company, error } = await supabaseAdmin
      .from('companies')
      .insert({ name: companyName, email: user.email })
      .select()
      .single()
    if (error || !company) return NextResponse.json({ error: 'Failed to create company' }, { status: 500 })
    companyId = company.id as string

    // Update user metadata
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, company_id: companyId },
    })
  }

  // Create users row
  const { error: userError } = await supabaseAdmin.from('users').insert({
    id: user.id,
    company_id: companyId,
    email: user.email,
    full_name: user.user_metadata?.full_name ?? null,
    role: user.user_metadata?.role ?? 'owner',
  })

  if (userError) return NextResponse.json({ error: userError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
