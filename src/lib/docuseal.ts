/**
 * Docuseal e-signature integration.
 *
 * Replaces the legacy SignNow + Yousign wrappers. We talk directly to the
 * REST API (https://api.docuseal.com) — no SDK because the surface we use is
 * just two endpoints:
 *   - POST /templates/pdf : upload a PDF and define signature field zones,
 *     returns a template_id.
 *   - POST /submissions   : create a signing request bound to the template,
 *     submitter receives an email and a signing URL.
 *
 * Auth header is X-Auth-Token (Docuseal convention).
 *
 * The API key must be set in DOCUSEAL_API_KEY (server-side only).
 */

const API_BASE = process.env.DOCUSEAL_API_BASE ?? 'https://api.docuseal.com'

function authHeaders(): Record<string, string> {
  const key = process.env.DOCUSEAL_API_KEY
  if (!key) throw new Error('DOCUSEAL_API_KEY manquant — configurer .env.local')
  return {
    'X-Auth-Token': key,
    'Content-Type': 'application/json',
  }
}

export interface SignatureSigner {
  email: string
  firstName: string
  lastName: string
}

export interface SignatureResult {
  /** Docuseal submission id — store this on the quote row to reconcile webhook events. */
  submissionId: string
  /** Per-signer record id (one submission can have multiple signers). */
  submitterId: string
  /** Direct signing URL for the submitter — usable in an email or embed. */
  signerUrl: string
}

interface DocusealTemplateResponse {
  id: number
  name: string
}

interface DocusealSubmitterResponse {
  id: number
  submission_id: number
  email: string
  slug: string
  embed_src?: string
  url?: string
}

/**
 * Send a PDF for signature via Docuseal.
 *
 * 1. Upload the PDF as a one-off template with a single signature field
 *    at the bottom-left (matches the placeholder zone the buildPDF helper
 *    leaves blank).
 * 2. Create a submission bound to that template — Docuseal emails the
 *    signer directly with the message we pass.
 *
 * The signature field uses normalized coordinates (0..1) relative to the
 * page, so we don't have to know the PDF page dimensions.
 */
export async function sendForSignature(
  title: string,
  pdfBuffer: Buffer,
  signer: SignatureSigner,
): Promise<SignatureResult> {
  // Quota note: Docuseal free tier caps templates/day. Creating a template
  // per devis (the v1 approach) can hit the limit at ~20-30 devis/day. To
  // mitigate, we always create an ad-hoc template here — the future
  // optimization (V1.4 in the plan) is to publish a single shared template
  // per service_type and reference it by template_id, attaching the PDF as
  // an attachment instead. Tracked separately to avoid risking the beta flow.

  // Step 1 — create a template from the PDF with a signature field.
  const tplRes = await fetch(`${API_BASE}/templates/pdf`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      name: title,
      documents: [{
        name: `${title}.pdf`,
        file: pdfBuffer.toString('base64'),
        // Position the signature box near the bottom-left of page 1,
        // matching the "SIGNATURE ÉLECTRONIQUE" placeholder in buildPDF.
        fields: [{
          name: 'signature',
          type: 'signature',
          role: 'Client',
          required: true,
          areas: [{ x: 0.07, y: 0.83, w: 0.3, h: 0.05, page: 0 }],
        }],
      }],
    }),
  })
  if (!tplRes.ok) {
    const errText = await tplRes.text().catch(() => '')
    throw new Error(`Docuseal /templates/pdf ${tplRes.status} : ${errText.slice(0, 300)}`)
  }
  const template = (await tplRes.json()) as DocusealTemplateResponse

  // Step 2 — create the submission. send_email=true triggers Docuseal's
  // own delivery; we override the body so the email reads in French.
  const subRes = await fetch(`${API_BASE}/submissions`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      template_id: template.id,
      send_email: true,
      message: {
        subject: `Devis à signer — ${title}`,
        body: `Bonjour ${signer.firstName},\n\nVous trouverez ci-joint votre devis à signer électroniquement. Cliquez sur le lien pour valider en quelques secondes.\n\nCordialement,\nL'équipe Proprely`,
      },
      submitters: [{
        email: signer.email,
        name: `${signer.firstName} ${signer.lastName}`.trim(),
        role: 'Client',
      }],
    }),
  })
  if (!subRes.ok) {
    const errText = await subRes.text().catch(() => '')
    throw new Error(`Docuseal /submissions ${subRes.status} : ${errText.slice(0, 300)}`)
  }
  const submitters = (await subRes.json()) as DocusealSubmitterResponse[]
  const first = submitters[0]
  if (!first) throw new Error('Docuseal /submissions : aucun submitter retourné')

  return {
    submissionId: String(first.submission_id),
    submitterId: String(first.id),
    signerUrl: first.embed_src ?? first.url ?? `https://docuseal.com/s/${first.slug}`,
  }
}
