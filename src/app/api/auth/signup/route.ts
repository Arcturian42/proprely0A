import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: Request) {
  const { email, password, companyName } = await request.json()

  if (!email || !password || !companyName) {
    return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
  }

  const admin = getAdminClient()

  const { data: company, error: companyError } = await admin
    .from('companies')
    .insert({ name: companyName, email })
    .select()
    .single()

  if (companyError || !company) {
    return NextResponse.json({ error: "Impossible de créer l'entreprise" }, { status: 500 })
  }

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      company_id: company.id,
      company_name: companyName,
      role: 'owner',
    },
  })

  if (authError || !authData.user) {
    await admin.from('companies').delete().eq('id', company.id)
    return NextResponse.json({ error: authError?.message ?? 'Erreur de création du compte' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
