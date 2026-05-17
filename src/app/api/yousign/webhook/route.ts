import { NextRequest, NextResponse } from 'next/server'

// Yousign webhook events
interface YousignEvent {
  name: string
  procedure?: { id: string; status: string }
  member?: { id: string; status: string; procedure?: { id: string } }
}

export async function POST(req: NextRequest) {
  try {
    const body: YousignEvent = await req.json()

    // Validate Yousign signature header (in production, verify HMAC)
    // const signature = req.headers.get('x-yousign-signature')

    if (body.name === 'procedure.finished' || body.name === 'member.finished') {
      const procedureId = body.procedure?.id || body.member?.procedure?.id
      if (!procedureId) {
        return NextResponse.json({ error: 'No procedure ID' }, { status: 400 })
      }

      // In a real implementation, query the database for the quote with this procedureId
      // and call signQuote() on it. Since this app uses client-side Zustand store,
      // we emit a server-sent event or store the signed status in a server-side DB.
      // For now, return success and the client polls or uses a different mechanism.

      console.log(`[Yousign Webhook] Procedure ${procedureId} signed`)

      return NextResponse.json({
        received: true,
        procedureId,
        status: 'signed',
      })
    }

    return NextResponse.json({ received: true })
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
}

// Verify webhook is reachable
export async function GET() {
  return NextResponse.json({ status: 'Yousign webhook endpoint active' })
}
