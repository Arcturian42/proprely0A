import { Resend } from 'resend'

/**
 * Thin wrapper around the Resend SDK.
 *
 * - In dev without RESEND_API_KEY set, sendEmail() returns a noop result
 *   so signup/invitation flows aren't blocked.
 * - The `from` address defaults to Resend's free sandbox sender so things
 *   work out of the box; in production set RESEND_FROM to a verified
 *   domain (e.g. "Proprely <noreply@proprely.fr>").
 */

const apiKey = process.env.RESEND_API_KEY
const FROM = process.env.RESEND_FROM ?? 'Proprely <onboarding@resend.dev>'

const client = apiKey ? new Resend(apiKey) : null

export interface EmailPayload {
  to: string | string[]
  subject: string
  html: string
  text?: string
  /** Optional reply-to override (default: same as `from`). */
  replyTo?: string
}

export type EmailResult =
  | { ok: true; id: string }
  | { ok: false; error: string; skipped?: boolean }

export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  if (!client) {
    return { ok: false, error: 'RESEND_API_KEY non configuré', skipped: true }
  }
  const { data, error } = await client.emails.send({
    from: FROM,
    to: Array.isArray(payload.to) ? payload.to : [payload.to],
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
    replyTo: payload.replyTo,
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true, id: data?.id ?? '' }
}

export function isResendConfigured(): boolean {
  return client !== null
}
