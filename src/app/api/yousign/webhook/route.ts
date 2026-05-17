import { NextRequest, NextResponse } from 'next/server'

// Yousign v3 webhook event shapes
interface YousignWebhookEvent {
  event_name: string
  event_time: string
  data: {
    signature_request?: {
      id: string
      name: string
      status: string
    }
    signer?: {
      id: string
      status: string
      signature_request_id?: string
    }
    // v2 compat
    procedure?: { id: string; status: string }
    member?: { id: string; status: string; procedure?: { id: string } }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: YousignWebhookEvent = await req.json()

    const eventName = body.event_name
    const srId =
      body.data?.signature_request?.id ||
      body.data?.signer?.signature_request_id ||
      body.data?.procedure?.id ||
      body.data?.member?.procedure?.id

    console.log(`[Yousign Webhook] event="${eventName}" srId="${srId}"`)

    // Yousign v3: signature_request.done means all signers have signed
    if (
      eventName === 'signature_request.done' ||
      eventName === 'procedure.finished' ||
      eventName === 'member.finished'
    ) {
      if (!srId) {
        return NextResponse.json({ error: 'No signature request ID in event' }, { status: 400 })
      }

      // In a full production setup you'd update a database here and the client
      // would poll or use server-sent events to pick up the change.
      // Since this app's state is client-side (Zustand), the client polls the
      // /api/yousign/status/{srId} endpoint and calls signQuote() locally.

      console.log(`[Yousign Webhook] ✓ Signature complete for SR: ${srId}`)

      return NextResponse.json({ received: true, srId, status: 'signed' })
    }

    if (eventName === 'signature_request.activated') {
      console.log(`[Yousign Webhook] SR activated: ${srId}`)
      return NextResponse.json({ received: true, srId, status: 'activated' })
    }

    return NextResponse.json({ received: true, eventName })
  } catch (err) {
    console.error('[Yousign Webhook] Error:', err)
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/yousign/webhook',
    accepts: ['signature_request.done', 'signature_request.activated', 'member.finished'],
  })
}
