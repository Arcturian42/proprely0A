import { NextRequest, NextResponse } from 'next/server'

// SignNow webhook payload for document.complete
interface SignNowEvent {
  event: string
  data?: {
    document_id?: string
    document?: { id: string; document_name: string }
    meta?: { user?: { email: string } }
  }
  // Some versions use top-level fields
  document_id?: string
}

export async function POST(req: NextRequest) {
  try {
    const body: SignNowEvent = await req.json()

    const eventName = body.event
    const documentId = body.data?.document_id || body.data?.document?.id || body.document_id

    console.log(`[SignNow Webhook] event="${eventName}" documentId="${documentId}"`)

    if (eventName === 'document.complete' || eventName === 'document.update') {
      if (!documentId) {
        return NextResponse.json({ error: 'No document ID in event' }, { status: 400 })
      }

      // In production: look up the quote by signnow_procedure_id === documentId,
      // mark it as signed, move the opportunity to Gagné, create client/site/mission.
      // Since state is client-side Zustand, the front-end polls /api/signnow/status/:documentId.

      console.log(`[SignNow Webhook] ✅ Document ${documentId} fully signed`)

      return NextResponse.json({ received: true, documentId, status: 'signed' })
    }

    return NextResponse.json({ received: true, eventName })
  } catch (err) {
    console.error('[SignNow Webhook] Error:', err)
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/signnow/webhook',
    accepts: ['document.complete', 'document.update'],
  })
}
