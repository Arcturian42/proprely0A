import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { sendForSignature } from '@/lib/docuseal'
import { requireAuthenticatedProfile } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Hard cap so a malicious / accidental client can't generate a 50 MB PDF
// that blocks the serverless thread. 500 line items is already 10x more than
// any real quote.
const MAX_LINE_ITEMS = 500

const SendQuoteBodySchema = z.object({
  quote: z.object({
    quote_number: z.string().min(1).max(50),
    title: z.string().min(1).max(200),
    surface_m2: z.number().nonnegative().nullable(),
    client_name: z.string().min(1).max(200),
    client_email: z.string().email().nullable(),
    costs: z.object({
      price_ht: z.number().nonnegative(),
      price_ttc: z.number().nonnegative(),
      vat_rate: z.number().min(0).max(1),
      total_cost_ht: z.number().nonnegative(),
      margin_rate: z.number().min(-1).max(1),
      labor_cost: z.number().nonnegative(),
      machines_cost: z.number().nonnegative(),
      consumables_cost: z.number().nonnegative(),
      transport_cost: z.number().nonnegative(),
    }),
    line_items: z
      .array(
        z.object({
          description: z.string().max(500),
          quantity: z.number(),
          unit: z.string().max(50),
          unit_price: z.number(),
          total: z.number(),
        }),
      )
      .min(1)
      .max(MAX_LINE_ITEMS),
  }),
  company: z.object({
    name: z.string().min(1).max(200),
    email: z.string().email(),
    phone: z.string().max(50),
    address: z.string().max(500),
    siret: z.string().max(20),
  }),
  signerEmail: z.string().email(),
  signerFirstName: z.string().min(1).max(100),
  signerLastName: z.string().min(1).max(100),
})

type SendQuoteBody = z.infer<typeof SendQuoteBodySchema>

function formatCurrency(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

function buildPDF(body: SendQuoteBody): Buffer {
  const { quote, company } = body
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

  // Header band
  doc.setFillColor(15, 15, 20)
  doc.rect(0, 0, W, 42, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(company.name, 14, 17)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(180, 180, 180)
  doc.text(company.address, 14, 24)
  doc.text(`${company.email}  ·  ${company.phone}`, 14, 29)
  doc.text(`SIRET: ${company.siret}`, 14, 34)

  // Quote number (right)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  doc.text(`DEVIS N° ${quote.quote_number}`, W - 14, 17, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(180, 180, 180)
  doc.text(today, W - 14, 24, { align: 'right' })
  if (quote.surface_m2) {
    doc.text(`Surface : ${quote.surface_m2} m²`, W - 14, 29, { align: 'right' })
  }

  // Client block
  doc.setFillColor(247, 246, 243)
  doc.roundedRect(14, 50, 80, 26, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(120, 120, 120)
  doc.text('CLIENT', 18, 57)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(15, 15, 20)
  doc.text(quote.client_name, 18, 64)
  if (quote.client_email) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text(quote.client_email, 18, 70)
  }

  // Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(15, 15, 20)
  doc.text(quote.title, 14, 90)

  // Line items table
  autoTable(doc, {
    startY: 96,
    head: [['Désignation', 'Qté', 'Unité', 'PU HT', 'Total HT']],
    body: quote.line_items.map(li => [
      li.description,
      li.quantity.toString(),
      li.unit,
      formatCurrency(li.unit_price),
      formatCurrency(li.total),
    ]),
    headStyles: {
      fillColor: [15, 15, 20],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: { fontSize: 8, textColor: [40, 40, 40] },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 15, halign: 'center' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
    theme: 'striped',
  })

  // Totals
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || 160
  const totalsX = W - 14 - 75

  const rows = [
    ['Total HT', formatCurrency(quote.costs.price_ht)],
    ['TVA (20%)', formatCurrency(quote.costs.price_ttc - quote.costs.price_ht)],
  ]
  rows.forEach(([label, value], i) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(80, 80, 80)
    doc.text(label, totalsX, finalY + 10 + i * 7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 15, 20)
    doc.text(value, W - 14, finalY + 10 + i * 7, { align: 'right' })
  })

  // TTC total highlighted
  doc.setFillColor(15, 15, 20)
  doc.roundedRect(totalsX - 4, finalY + 25, W - 14 - totalsX + 4, 12, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  doc.text('Total TTC', totalsX, finalY + 33)
  doc.text(formatCurrency(quote.costs.price_ttc), W - 17, finalY + 33, { align: 'right' })

  // Signature zone
  const sigY = finalY + 55
  doc.setFillColor(247, 246, 243)
  doc.roundedRect(14, sigY, W - 28, 40, 3, 3, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.text('SIGNATURE ÉLECTRONIQUE DU CLIENT', 18, sigY + 8)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(150, 150, 150)
  doc.text('Ce document sera signé électroniquement via Docuseal.', 18, sigY + 15)
  doc.text('En signant, vous acceptez les conditions et le devis ci-dessus.', 18, sigY + 21)

  // Footer
  const pageH = 297
  doc.setFillColor(15, 15, 20)
  doc.rect(0, pageH - 12, W, 12, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(150, 150, 150)
  doc.text(
    `${company.name}  ·  ${company.address}  ·  SIRET: ${company.siret}`,
    W / 2,
    pageH - 4.5,
    { align: 'center' }
  )

  return Buffer.from(doc.output('arraybuffer'))
}

export async function POST(req: NextRequest) {
  const gate = await requireAuthenticatedProfile()
  if (gate instanceof NextResponse) return gate

  // 5 envois / min / user — PDF gen + Resend dispatch, ressource-heavy.
  const rl = rateLimit(`quotes-send:${gate.userId}`, 5, 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Trop d\'envois rapprochés. Réessaie dans une minute.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    )
  }

  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide.' }, { status: 400 })
  }

  const parsed = SendQuoteBodySchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Payload invalide.' },
      { status: 400 },
    )
  }
  const body = parsed.data

  try {
    const { quote, signerEmail, signerFirstName, signerLastName } = body

    // Generate PDF
    const pdfBuffer = buildPDF(body)

    // Send via Docuseal — returns submissionId we'll match against on webhook.
    const result = await sendForSignature(
      quote.title,
      pdfBuffer,
      { firstName: signerFirstName, lastName: signerLastName, email: signerEmail }
    )

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin

    return NextResponse.json({
      success: true,
      signatureRequestId: result.submissionId,
      signerUrl: result.signerUrl,
      submissionId: result.submissionId,
      submitterId: result.submitterId,
      webhookUrl: `${appUrl}/api/docuseal/webhook`,
    })
  } catch (err) {
    console.error('[Send Quote]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
