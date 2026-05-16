'use client'

import { useCallback } from 'react'
import { Quote, PipelineLead } from '@/types/pipeline'
import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'
import { toast } from 'sonner'

interface QuotePDFProps {
  quote: Quote
  lead: PipelineLead
}

const COMPANY_INFO = {
  name: 'Proprely Nettoyage Pro',
  address: '10 Rue de la Propreté',
  city: '75001 Paris',
  siret: '12345678901234',
  email: 'contact@proprely.fr',
  phone: '01 23 45 67 89',
}

const CONDITIONS = `CONDITIONS GÉNÉRALES DE VENTE\n\n• Ce devis est valable 30 jours à compter de sa date d'émission.\n• Les prestations seront réalisées selon les protocoles certifiés Proprely.\n• Paiement : 30 jours fin de mois réception facture.\n• TVA applicable : 20%.\n• Tout avenant fera l'objet d'un devis complémentaire.\n• En cas de résiliation, préavis de 3 mois requis.`

export function QuotePDF({ quote, lead }: QuotePDFProps) {
  const handleGenerate = useCallback(async () => {
    try {
      // Dynamic import to avoid SSR issues
      const jsPDF = (await import('jspdf')).default
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()
      const margin = 20

      // Header background
      doc.setFillColor(59, 91, 219) // #3B5BDB
      doc.rect(0, 0, pageW, 45, 'F')

      // Company name
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(22)
      doc.setFont('helvetica', 'bold')
      doc.text('PROPRELY', margin, 18)

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text('Services de nettoyage professionnels', margin, 24)
      doc.text(`${COMPANY_INFO.address}, ${COMPANY_INFO.city}`, margin, 30)
      doc.text(`SIRET: ${COMPANY_INFO.siret} | ${COMPANY_INFO.email} | ${COMPANY_INFO.phone}`, margin, 36)

      // Quote title
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text(`DEVIS N° ${quote.quote_number}`, pageW - margin, 18, { align: 'right' })
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(`Date : ${new Date(quote.created_at).toLocaleDateString('fr-FR')}`, pageW - margin, 26, { align: 'right' })
      if (quote.valid_until) {
        doc.text(`Valable jusqu'au : ${new Date(quote.valid_until).toLocaleDateString('fr-FR')}`, pageW - margin, 32, { align: 'right' })
      }

      let y = 55

      // Client info
      doc.setTextColor(0, 0, 0)
      doc.setFillColor(240, 242, 255)
      doc.rect(margin, y, pageW - margin * 2, 28, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('CLIENT', margin + 4, y + 8)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text(lead.company_name, margin + 4, y + 15)
      if (lead.address) doc.text(lead.address, margin + 4, y + 21)
      if (lead.siret) doc.text(`SIRET : ${lead.siret}`, margin + 4, y + 27)

      y += 38

      // Line items table
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text('PRESTATIONS', margin, y)
      y += 5

      autoTable(doc, {
        startY: y,
        head: [['Service', 'Surface', 'Fréquence', 'P.U. HT', 'Quantité', 'Total HT']],
        body: quote.line_items.map(li => [
          li.service,
          li.surface ? `${li.surface} ${li.surface_unit ?? 'm²'}` : '-',
          li.frequency ?? '-',
          `${li.unit_price.toFixed(2)} €`,
          li.quantity.toString(),
          `${li.total.toFixed(2)} €`,
        ]),
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [59, 91, 219], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 249, 255] },
        margin: { left: margin, right: margin },
      })

      y = ((doc as any).lastAutoTable?.finalY ?? y) + 8

      // Cost breakdown
      autoTable(doc, {
        startY: y,
        head: [['Ventilation des coûts', 'Montant HT']],
        body: [
          ['Main d\'œuvre', `${quote.labor_cost.toFixed(2)} €`],
          ['Produits d\'entretien', `${quote.products_cost.toFixed(2)} €`],
          ['Déplacements', `${quote.travel_cost.toFixed(2)} €`],
          ['Équipement', `${quote.equipment_cost.toFixed(2)} €`],
        ],
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [100, 116, 139], textColor: 255, fontSize: 8 },
        margin: { left: margin, right: pageW / 2 },
      })

      // Totals
      const totalsY = y
      const rightX = pageW / 2 + 5
      const rightW = pageW - rightX - margin

      doc.setFillColor(248, 249, 255)
      doc.rect(rightX, totalsY, rightW, 35, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(100, 116, 139)
      doc.text('Sous-total HT :', rightX + 5, totalsY + 10)
      doc.text(`${quote.subtotal_ht.toFixed(2)} €`, rightX + rightW - 5, totalsY + 10, { align: 'right' })
      doc.text(`TVA (${quote.tva_rate}%) :`, rightX + 5, totalsY + 18)
      doc.text(`${quote.tva_amount.toFixed(2)} €`, rightX + rightW - 5, totalsY + 18, { align: 'right' })

      doc.setFillColor(59, 91, 219)
      doc.rect(rightX, totalsY + 22, rightW, 13, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text('TOTAL TTC :', rightX + 5, totalsY + 31)
      doc.text(`${quote.total_ttc.toFixed(2)} €`, rightX + rightW - 5, totalsY + 31, { align: 'right' })

      y = Math.max((doc as any).lastAutoTable?.finalY ?? totalsY, totalsY + 40) + 10

      // Notes
      if (quote.notes) {
        doc.setTextColor(0, 0, 0)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.text('NOTES :', margin, y)
        doc.setFont('helvetica', 'normal')
        const noteLines = doc.splitTextToSize(quote.notes, pageW - margin * 2)
        doc.text(noteLines, margin, y + 5)
        y += 5 + noteLines.length * 4 + 8
      }

      // Conditions
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(7)
      doc.setTextColor(150, 150, 150)
      const condLines = doc.splitTextToSize(CONDITIONS, pageW - margin * 2)
      doc.text(condLines, margin, y)
      y += condLines.length * 3 + 10

      // Signature zones
      if (y > 240) { doc.addPage(); y = 20 }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(0, 0, 0)
      doc.text('Signature Proprely', margin, y)
      doc.text('Signature Client', pageW / 2 + 5, y)
      doc.text('(Bon pour accord)', pageW / 2 + 5, y + 5)
      y += 8

      doc.setDrawColor(200, 200, 200)
      doc.rect(margin, y, 65, 25)
      doc.rect(pageW / 2 + 5, y, 65, 25)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(180, 180, 180)
      doc.text('Signé numériquement', margin + 5, y + 20)

      doc.save(`devis-${quote.quote_number}.pdf`)
      toast.success('PDF généré et téléchargé')
    } catch (err) {
      console.error(err)
      toast.error('Erreur lors de la génération du PDF')
    }
  }, [quote, lead])

  return (
    <Button size="sm" variant="outline" onClick={handleGenerate} className="gap-1">
      <FileText className="w-3 h-3" /> Voir PDF
    </Button>
  )
}
