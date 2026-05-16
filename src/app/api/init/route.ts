import { NextResponse } from 'next/server'
import { fetchAllData } from '@/lib/supabase/queries'

export async function GET() {
  try {
    const data = await fetchAllData()
    return NextResponse.json({
      ok: true,
      counts: {
        agents: data.agents.length,
        clients: data.clients.length,
        missions: data.missions.length,
      },
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
