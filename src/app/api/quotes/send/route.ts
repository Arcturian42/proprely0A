import { NextRequest, NextResponse } from 'next/server'
import { sendForSignature } from '@/lib/docuseal'
import { requireAuthenticatedProfile } from '@/lib/supabase/server'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface SendQuoteBody {
  quote: {
    quote_number: string
    title: string
    surface_m2: number | null
    client_name: string
    client_email: string | null
    costs: {
      price_ht: number
      price_ttc: number
      vat_rate: number
      total_cost_ht: number
      margin_rate: number
      labor_cost: number
      machines_cost: number
      consumables_cost: number
      transport_cost: number
    }
    line_items: {
      description: string
      quantity: number
      unit: string
      unit_price: number
      total: number
    }[]
  }
  company: {
    name: string
    email: string
    phone: string
    address: string
    siret: string
  }
  signerEmail: string
  signerFirstName: string
  signerLastName: string
}

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

  try {
    const body: SendQuoteBody = await req.json()
    const { quote, signerEmail, signerFirstName, signerLastName } = body

    if (!signerEmail) {
      return NextResponse.json({ error: 'Signer email required' }, { status: 400 })
    }

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
