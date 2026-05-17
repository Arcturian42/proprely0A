/**
 * Transactional email templates rendered as inline HTML strings.
 *
 * Kept dependency-free (no React Email / MJML) so they can be sent from
 * anywhere (server actions, route handlers) without extra compile steps.
 * Each template returns `{ subject, html, text }` so we always have a
 * plain-text fallback for clients that strip HTML.
 *
 * Visual identity matches the app : Proprely wordmark, dark text on white,
 * accent color #3B5BDB.
 */

const BRAND = 'Proprely'
const ACCENT = '#3B5BDB'

function shell(title: string, body: string): string {
  return `<!doctype html>
<html lang="fr">
<body style="margin:0;padding:0;background:#f7f6f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f6f3;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="540" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.04);overflow:hidden;max-width:100%;">
        <tr><td style="padding:24px 32px;border-bottom:1px solid #eee;">
          <div style="font-size:18px;font-weight:600;color:#0f0f14;letter-spacing:-0.01em;">${BRAND}</div>
        </td></tr>
        <tr><td style="padding:28px 32px 8px;">
          <h1 style="margin:0 0 16px;color:#0f0f14;font-size:20px;font-weight:600;letter-spacing:-0.01em;">${title}</h1>
          ${body}
        </td></tr>
        <tr><td style="padding:24px 32px;border-top:1px solid #eee;color:#9b9a97;font-size:11px;line-height:1.5;">
          Cet email a été envoyé automatiquement par ${BRAND}. Si tu n'es pas le bon destinataire, ignore-le.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function button(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:${ACCENT};color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:500;margin:16px 0;">${label}</a>`
}

function paragraph(text: string): string {
  return `<p style="color:#444;font-size:14px;line-height:1.6;margin:0 0 12px;">${text}</p>`
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Invitation                                                                 */
/* ────────────────────────────────────────────────────────────────────────── */

export function invitationEmail(args: {
  inviterName: string
  companyName: string
  roleLabel: string
  acceptUrl: string
}) {
  const subject = `${args.inviterName} t'invite à rejoindre ${args.companyName} sur ${BRAND}`
  const html = shell(
    `Rejoins ${args.companyName} sur ${BRAND}`,
    [
      paragraph(`Bonjour,`),
      paragraph(
        `<strong>${args.inviterName}</strong> t'invite à rejoindre l'équipe <strong>${args.companyName}</strong> sur ${BRAND} en tant que <strong>${args.roleLabel}</strong>.`,
      ),
      paragraph(
        `Clique sur le bouton ci-dessous pour finaliser ton compte. L'invitation expire dans 7 jours.`,
      ),
      button("Accepter l'invitation", args.acceptUrl),
      paragraph(
        `<span style="color:#9b9a97;font-size:12px;">Si le bouton ne fonctionne pas, copie-colle cette URL dans ton navigateur :</span><br><span style="color:#9b9a97;font-size:12px;word-break:break-all;">${args.acceptUrl}</span>`,
      ),
    ].join(''),
  )
  const text = [
    `${args.inviterName} t'invite à rejoindre ${args.companyName} sur ${BRAND} en tant que ${args.roleLabel}.`,
    ``,
    `Lien d'acceptation (valable 7 jours) :`,
    args.acceptUrl,
  ].join('\n')
  return { subject, html, text }
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Quote sent (sales-facing receipt)                                          */
/* ────────────────────────────────────────────────────────────────────────── */

export function quoteSentEmail(args: {
  recipientName: string
  clientName: string
  quoteNumber: string
  signUrl?: string
}) {
  const subject = `Devis ${args.quoteNumber} envoyé à ${args.clientName}`
  const html = shell(
    `Devis envoyé`,
    [
      paragraph(`Bonjour ${args.recipientName},`),
      paragraph(
        `Le devis <strong>${args.quoteNumber}</strong> a été envoyé à <strong>${args.clientName}</strong> pour signature électronique via Docuseal.`,
      ),
      paragraph(
        `Tu seras notifié dès que le client signe. En attendant, tu peux suivre l'avancée depuis le pipeline.`,
      ),
      args.signUrl
        ? paragraph(
            `<span style="color:#9b9a97;font-size:12px;">Lien de signature côté client :</span><br><a href="${args.signUrl}" style="color:${ACCENT};font-size:12px;word-break:break-all;">${args.signUrl}</a>`,
          )
        : '',
    ].join(''),
  )
  const text = [
    `Devis ${args.quoteNumber} envoyé à ${args.clientName} pour signature via Docuseal.`,
    args.signUrl ? `Lien client : ${args.signUrl}` : '',
  ].filter(Boolean).join('\n')
  return { subject, html, text }
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Quote signed — sent to the salesperson who created the quote                */
/* ────────────────────────────────────────────────────────────────────────── */

export function quoteSignedEmail(args: {
  recipientName: string
  clientName: string
  quoteNumber: string
  signedAt: string
  appUrl: string
}) {
  const subject = `🎉 ${args.clientName} a signé le devis ${args.quoteNumber}`
  const html = shell(
    `Devis signé`,
    [
      paragraph(`Bonjour ${args.recipientName},`),
      paragraph(
        `Bonne nouvelle : <strong>${args.clientName}</strong> vient de signer le devis <strong>${args.quoteNumber}</strong>.`,
      ),
      paragraph(
        `Le contrat est automatiquement remonté dans le cockpit opérationnel — tu peux maintenant organiser la mission.`,
      ),
      button('Aller au cockpit', `${args.appUrl}/operations/cockpit`),
      paragraph(
        `<span style="color:#9b9a97;font-size:12px;">Signé le ${new Date(args.signedAt).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })}.</span>`,
      ),
    ].join(''),
  )
  const text = `${args.clientName} a signé le devis ${args.quoteNumber}. Le contrat est dans /operations/cockpit.`
  return { subject, html, text }
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Mission assigned — sent to the agent attached to a mission                 */
/* ────────────────────────────────────────────────────────────────────────── */

export function missionAssignedEmail(args: {
  agentFirstName: string
  clientName: string
  siteName: string | null
  scheduledDate: string
  startTime: string | null
  plannedHours: number
  appUrl: string
}) {
  const dateStr = new Date(args.scheduledDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const subject = `Nouvelle mission assignée — ${dateStr}`
  const html = shell(
    `Mission à venir`,
    [
      paragraph(`Salut ${args.agentFirstName},`),
      paragraph(
        `Tu as été affecté(e) à une mission le <strong>${dateStr}</strong>${args.startTime ? ` à <strong>${args.startTime}</strong>` : ''} chez <strong>${args.clientName}</strong>${args.siteName ? ` (${args.siteName})` : ''} — durée prévue ${args.plannedHours}h.`,
      ),
      button('Voir mes missions', `${args.appUrl}/agent/mes-missions`),
      paragraph(
        `<span style="color:#9b9a97;font-size:12px;">Tu peux retrouver le détail (adresse, code d'accès, SOP) depuis l'app.</span>`,
      ),
    ].join(''),
  )
  const text = `Tu as une nouvelle mission le ${dateStr} chez ${args.clientName}. Détails sur ${args.appUrl}/agent/mes-missions`
  return { subject, html, text }
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Generic "Hello from Proprely" — used by /api/dev/test-resend               */
/* ────────────────────────────────────────────────────────────────────────── */

export function devTestEmail(args: { to: string }) {
  const subject = `Test Resend depuis ${BRAND}`
  const html = shell(
    `Test Resend`,
    [
      paragraph(`Salut,`),
      paragraph(
        `Ceci est un mail de test envoyé à <strong>${args.to}</strong> via l'API Resend depuis ton app ${BRAND}.`,
      ),
      paragraph(
        `Si tu le vois, ton intégration Resend fonctionne — les emails d'invitation et de devis utiliseront le même canal.`,
      ),
    ].join(''),
  )
  const text = `Test Resend depuis ${BRAND} → ${args.to}. Si tu reçois ce mail, ça fonctionne.`
  return { subject, html, text }
}
