/**
 * SignNow integration using official @signnow/api-client SDK
 * Auth: API key (access token) stored in SIGNNOW_API_KEY env var
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const SignNow = require('@signnow/api-client')

function getClient() {
  const basicToken = process.env.SIGNNOW_BASIC_TOKEN!
  return SignNow({ credentials: basicToken, production: true })
}

function getToken(): string {
  return process.env.SIGNNOW_API_KEY!
}

// Promisify a SignNow SDK call
function call<T>(fn: (args: Record<string, unknown>, cb: (err: unknown, res: T) => void) => void, args: Record<string, unknown>): Promise<T> {
  return new Promise((resolve, reject) => {
    fn({ ...args, token: getToken() }, (err: unknown, res: T) => {
      if (err) return reject(new Error(typeof err === 'string' ? err : JSON.stringify(err)))
      if (typeof res === 'string' && (res as string).includes('not in allowlist')) {
        return reject(new Error(`SignNow IP restriction: server IP must be whitelisted in app.signnow.com/webapp/api-dashboard/keys`))
      }
      resolve(res)
    })
  })
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
  const sn = getClient()

  // Write PDF to temp file (SDK requires a file path)
  const { writeFileSync, unlinkSync } = await import('fs')
  const { tmpdir } = await import('os')
  const { join } = await import('path')
  const tmpPath = join(tmpdir(), `devis-${Date.now()}.pdf`)
  writeFileSync(tmpPath, pdfBuffer)

  let documentId: string
  try {
    // 1. Upload document
    const upload = await call<{ id: string }>(sn.document.create, { filepath: tmpPath })
    documentId = upload.id
  } finally {
    unlinkSync(tmpPath)
  }

  // 2. Add signature field
  await call(sn.document.update, {
    id: documentId,
    fields: [{
      x: 77, y: 680, width: 200, height: 50,
      page_number: 0, role: 'Signer 1',
      required: true, type: 'signature',
    }],
  })

  // 3. Get sender email
  const user = await call<{ email: string }>(sn.user.retrieve, {})

  // 4. Send invite
  const invite = await call<{ id?: string; status?: string }>(sn.document.invite, {
    id: documentId,
    data: {
      from: user.email,
      to: [{
        email: signer.email,
        role: 'Signer 1',
        role_id: '',
        order: 1,
        subject: `Devis à signer — ${title}`,
        message: `Bonjour ${signer.firstName},\n\nVeuillez trouver votre devis à signer électroniquement.\n\nCordialement,\nProprely Nettoyage Pro`,
      }],
    },
  })

  // 5. Get direct signing link (best-effort)
  let signerUrl = `https://app.signnow.com/webapp/document/${documentId}`
  try {
    const link = await call<{ link?: string }>(sn.link.create, {
      document_id: documentId,
      data: { email: signer.email },
    })
    if (link.link) signerUrl = link.link
  } catch {
    // link endpoint is optional
  }

  return {
    documentId,
    inviteId: invite?.id || documentId,
    signerUrl,
  }
}

/** Register document.complete webhook in SignNow */
export async function registerWebhook(callbackUrl: string): Promise<void> {
  const sn = getClient()
  await call(sn.webhook.create, {
    data: {
      event: 'document.complete',
      entity_id: process.env.SIGNNOW_CLIENT_ID,
      action: 'callback',
      attributes: { callback: callbackUrl, use_tls_12: true },
    },
  })
}
