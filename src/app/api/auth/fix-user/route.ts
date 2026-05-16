import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = getAdminClient()

  const { data: existing } = await admin.from('users').select('id').eq('id', user.id).single()
  if (existing) return NextResponse.json({ ok: true, already: true })

  let companyId = user.user_metadata?.company_id as string | undefined

  if (!companyId) {
    const companyName = (user.user_metadata?.company_name as string | undefined) ?? user.email ?? 'Mon Entreprise'
    const { data: company, error } = await admin
      .from('companies')
      .insert({ name: companyName, email: user.email })
      .select()
      .single()
    if (error || !company) return NextResponse.json({ error: 'Failed to create company' }, { status: 500 })
    companyId = company.id as string

    await admin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, company_id: companyId },
    })
  }

  const { error: userError } = await admin.from('users').insert({
    id: user.id,
    company_id: companyId,
    email: user.email,
    full_name: user.user_metadata?.full_name ?? null,
    role: user.user_metadata?.role ?? 'owner',
  })

  if (userError) return NextResponse.json({ error: userError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
