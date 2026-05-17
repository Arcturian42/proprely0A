/**
 * SignNow API client (https://api.signnow.com)
 * Auth: OAuth2 password grant with Basic Auth header
 */

const BASE = 'https://api.signnow.com'

async function getToken(): Promise<string> {
  const clientId = process.env.SIGNNOW_CLIENT_ID!
  const clientSecret = process.env.SIGNNOW_CLIENT_SECRET!
  const username = process.env.SIGNNOW_USERNAME!
  const password = process.env.SIGNNOW_PASSWORD!

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const res = await fetch(`${BASE}/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'password',
      username,
      password,
      scope: '*',
    }),
  })

  if (!res.ok) throw new Error(`SignNow auth failed: ${await res.text()}`)
  const data: { access_token: string } = await res.json()
  return data.access_token
}

function bearer(token: string) {
  return { Authorization: `Bearer ${token}` }
}

export interface SignNowSigner {
  email: string
  firstName: string
  lastName: string
}

export interface SignNowResult {
  documentId: string
  inviteId: string
  signerUrl: string
}

export async function sendForSignature(
  title: string,
  pdfBuffer: Buffer,
  signer: SignNowSigner
): Promise<SignNowResult> {
  const token = await getToken()

  // 1. Upload document
  const form = new FormData()
  form.append('file', new Blob([pdfBuffer.buffer as ArrayBuffer], { type: 'application/pdf' }), 'devis.pdf')

  const uploadRes = await fetch(`${BASE}/document`, {
    method: 'POST',
    headers: bearer(token),
    body: form,
  })
  if (!uploadRes.ok) throw new Error(`Upload failed: ${await uploadRes.text()}`)
  const upload: { id: string } = await uploadRes.json()
  const documentId = upload.id

  // 2. Add signature field on page 1
  const fieldsRes = await fetch(`${BASE}/document/${documentId}`, {
    method: 'PUT',
    headers: { ...bearer(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: [
        {
          x: 77,
          y: 580,
          width: 200,
          height: 50,
          page_number: 0,
          role: 'Signer 1',
          required: true,
          type: 'signature',
        },
      ],
    }),
  })
  if (!fieldsRes.ok) throw new Error(`Add fields failed: ${await fieldsRes.text()}`)

  // 3. Send free-form invite
  const inviteRes = await fetch(`${BASE}/document/${documentId}/invite`, {
    method: 'POST',
    headers: { ...bearer(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.SIGNNOW_USERNAME,
      to: [
        {
          email: signer.email,
          role: 'Signer 1',
          role_id: '',
          order: 1,
          subject: `Devis à signer — ${title}`,
          message: `Bonjour ${signer.firstName},\n\nVeuillez trouver ci-joint votre devis à signer électroniquement.\n\nCordialement,\nL'équipe Proprely`,
        },
      ],
    }),
  })
  if (!inviteRes.ok) throw new Error(`Send invite failed: ${await inviteRes.text()}`)
  const invite: { id?: string; status?: string } = await inviteRes.json()

  // 4. Get signing link for direct access
  const linkRes = await fetch(`${BASE}/document/${documentId}/invite/link`, {
    method: 'POST',
    headers: { ...bearer(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: signer.email }),
  })
  const linkData: { link?: string } = linkRes.ok ? await linkRes.json() : {}

  return {
    documentId,
    inviteId: invite.id || documentId,
    signerUrl: linkData.link || `https://app.signnow.com/webapp/document/${documentId}`,
  }
}

/** Register a webhook for document.complete events */
export async function registerWebhook(callbackUrl: string): Promise<void> {
  const token = await getToken()

  await fetch(`${BASE}/api/v2/events`, {
    method: 'POST',
    headers: { ...bearer(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'document.complete',
      entity_id: process.env.SIGNNOW_CLIENT_ID,
      action: 'callback',
      attributes: {
        callback: callbackUrl,
        use_tls_12: true,
        docid_queryparam: false,
      },
    }),
  })
}
