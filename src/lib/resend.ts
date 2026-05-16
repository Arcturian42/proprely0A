// Resend email client — set RESEND_API_KEY in environment
// import { Resend } from 'resend'
// const resend = new Resend(process.env.RESEND_API_KEY)

export interface SendQuoteEmailParams {
  to: string
  contactName: string
  companyName: string
  quoteNumber: string
  totalTTC: number
  validUntil?: string
  pdfBase64: string
}

export async function sendQuoteEmail(params: SendQuoteEmailParams): Promise<{ success: boolean; error?: string }> {
  // Production: uncomment Resend integration
  // const { data, error } = await resend.emails.send({
  //   from: 'Proprely <devis@proprely.fr>',
  //   to: [params.to],
  //   subject: `Devis Proprely #${params.quoteNumber} — ${params.companyName}`,
  //   html: buildQuoteEmailHtml(params),
  //   attachments: [{ filename: `devis-${params.quoteNumber}.pdf`, content: params.pdfBase64 }],
  // })
  // if (error) return { success: false, error: error.message }
  // return { success: true }

  // MVP: simulate send
  await new Promise(r => setTimeout(r, 800))
  console.log('📧 [MOCK] Email envoyé à', params.to, 'pour devis', params.quoteNumber)
  return { success: true }
}

export function buildQuoteEmailHtml(params: SendQuoteEmailParams): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>Devis Proprely</title></head>
<body style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #3B5BDB; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Proprely</h1>
    <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">Services de nettoyage professionnels</p>
  </div>
  <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
    <p>Bonjour ${params.contactName},</p>
    <p>Veuillez trouver ci-joint notre devis <strong>#${params.quoteNumber}</strong> pour <strong>${params.companyName}</strong>.</p>
    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #6b7280;">Montant total TTC</p>
      <p style="margin: 4px 0 0; font-size: 28px; font-weight: bold; color: #3B5BDB;">
        ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(params.totalTTC)}
      </p>
      ${params.validUntil ? `<p style="margin: 8px 0 0; font-size: 12px; color: #9ca3af;">Valable jusqu'au ${new Date(params.validUntil).toLocaleDateString('fr-FR')}</p>` : ''}
    </div>
    <p>Pour signer ce devis, cliquez sur le bouton ci-dessous :</p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="#" style="background: #3B5BDB; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
        Signer le devis en ligne
      </a>
    </div>
    <p style="font-size: 13px; color: #6b7280;">Vous pouvez également trouver le devis en pièce jointe (PDF).</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
      Proprely Nettoyage Pro · contact@proprely.fr · 01 23 45 67 89
    </p>
  </div>
</body>
</html>`
}
