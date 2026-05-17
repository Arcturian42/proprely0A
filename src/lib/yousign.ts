const BASE_URL = process.env.YOUSIGN_SANDBOX === 'true'
  ? 'https://api-sandbox.yousign.app/v3'
  : 'https://api.yousign.app/v3'

function headers(extra?: Record<string, string>) {
  return {
    Authorization: `Bearer ${process.env.YOUSIGN_API_KEY}`,
    ...extra,
  }
}

export interface YousignSigner {
  firstName: string
  lastName: string
  email: string
}

export interface YousignResult {
  signatureRequestId: string
  signerUrl: string
  documentId: string
}

/** Full flow: create request → upload PDF → add signer → activate */
export async function sendForSignature(
  title: string,
  pdfBuffer: Buffer,
  signer: YousignSigner,
  webhookUrl: string
): Promise<YousignResult> {
  // 1. Create signature request
  const srRes = await fetch(`${BASE_URL}/signature_requests`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      name: title,
      delivery_mode: 'email',
      timezone: 'Europe/Paris',
      ...(webhookUrl ? { webhook_subscription: { url: webhookUrl, sandbox: process.env.YOUSIGN_SANDBOX === 'true' } } : {}),
    }),
  })
  if (!srRes.ok) throw new Error(`Create SR failed: ${await srRes.text()}`)
  const sr: { id: string } = await srRes.json()

  // 2. Upload document
  const form = new FormData()
  form.append('file', new Blob([pdfBuffer.buffer as ArrayBuffer], { type: 'application/pdf' }), 'devis.pdf')
  form.append('nature', 'signable_document')

  const docRes = await fetch(`${BASE_URL}/signature_requests/${sr.id}/documents`, {
    method: 'POST',
    headers: headers(),
    body: form,
  })
  if (!docRes.ok) throw new Error(`Upload doc failed: ${await docRes.text()}`)
  const doc: { id: string } = await docRes.json()

  // 3. Add signer with signature field on last page
  const signerRes = await fetch(`${BASE_URL}/signature_requests/${sr.id}/signers`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      info: {
        first_name: signer.firstName,
        last_name: signer.lastName,
        email: signer.email,
        locale: 'fr',
      },
      signature_level: 'electronic_signature',
      signature_authentication_mode: 'no_otp',
      fields: [
        {
          type: 'signature',
          document_id: doc.id,
          page: 1,
          x: 77,
          y: 580,
          width: 200,
          height: 60,
        },
      ],
    }),
  })
  if (!signerRes.ok) throw new Error(`Add signer failed: ${await signerRes.text()}`)
  const signerData: { id: string; signature_link?: string } = await signerRes.json()

  // 4. Activate
  const activateRes = await fetch(`${BASE_URL}/signature_requests/${sr.id}/activate`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({}),
  })
  if (!activateRes.ok) throw new Error(`Activate failed: ${await activateRes.text()}`)

  // 5. Get signer URL
  const signerDetailRes = await fetch(
    `${BASE_URL}/signature_requests/${sr.id}/signers/${signerData.id}`,
    { headers: headers() }
  )
  const signerDetail: { signature_link?: string } = signerDetailRes.ok ? await signerDetailRes.json() : {}

  return {
    signatureRequestId: sr.id,
    documentId: doc.id,
    signerUrl: signerDetail.signature_link || `https://app.yousign.com/procedure/sign#${sr.id}`,
  }
}
