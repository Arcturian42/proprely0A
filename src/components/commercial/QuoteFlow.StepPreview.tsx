import { CheckCircle2, Loader2, RefreshCw, Send } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Quote } from '@/types'

import { STEP_TITLES } from './QuoteFlow.constants'
import { QuoteStatusBadge, StepHeader } from './QuoteFlow.shared'

// Step 5 — PDF-style preview of the final quote with send / regenerate
// actions. Extracted from QuoteFlow.tsx.

interface Props {
  quote: Quote | null
  companySettings: {
    name: string
    address?: string
    email?: string
    phone?: string
  }
  onBack: () => void
  onRegenerate: () => void
  onSend: (id: string) => void
  onBackToList: () => void
  sendingQuoteId: string | null
}

export function StepPreview({
  quote,
  companySettings,
  onBack,
  onRegenerate,
  onSend,
  onBackToList,
  sendingQuoteId,
}: Props) {
  if (!quote) {
    return (
      <div className="space-y-4">
        <StepHeader title={STEP_TITLES[5]} step={5} total={5} onBack={onBack} />
        <p className="text-sm text-slate-500 text-center py-8">Devis introuvable</p>
        <button
          onClick={onBackToList}
          className="w-full text-center text-xs text-slate-400 hover:text-slate-600 py-1"
        >
          ← Retour à la liste
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <StepHeader title={STEP_TITLES[5]} step={5} total={5} onBack={onBack} />

      {/* PDF-style preview */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-700 p-5 text-white">
          <div className="flex justify-between items-start gap-4">
            <div>
              <p className="font-bold text-base">{companySettings.name}</p>
              {companySettings.address && (
                <p className="text-slate-300 text-xs mt-0.5">{companySettings.address}</p>
              )}
              {companySettings.email && (
                <p className="text-slate-300 text-xs">
                  {companySettings.email}
                  {companySettings.phone ? ` — ${companySettings.phone}` : ''}
                </p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-slate-400">Devis n°</p>
              <p className="font-mono font-bold text-base">{quote.quote_number}</p>
              <p className="text-xs text-slate-400 mt-1">{formatDate(quote.created_at)}</p>
              <QuoteStatusBadge status={quote.status} />
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Client */}
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-0.5 uppercase tracking-wide font-medium">
              Client
            </p>
            <p className="font-semibold text-slate-900">{quote.client_name}</p>
            {quote.client_email && (
              <p className="text-xs text-slate-500">{quote.client_email}</p>
            )}
          </div>

          {/* Object */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Objet
            </p>
            <p className="font-semibold text-slate-900 text-sm">{quote.title}</p>
            {quote.surface_m2 && (
              <p className="text-xs text-slate-500 mt-0.5">
                Surface totale : {quote.surface_m2} m²
              </p>
            )}
          </div>

          {/* Line items */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Détail des prestations
            </p>
            <div className="space-y-0.5">
              {quote.line_items.map((li) => (
                <div
                  key={li.id}
                  className="flex justify-between text-sm py-1.5 border-b border-slate-100 last:border-0 gap-2"
                >
                  <span className="text-slate-700 flex-1 pr-2 text-xs">{li.description}</span>
                  <span className="text-slate-400 text-xs whitespace-nowrap">
                    {li.quantity} {li.unit}
                  </span>
                  <span className="font-medium text-slate-900 text-xs text-right w-16 flex-shrink-0">
                    {formatCurrency(li.total)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-1.5 pt-2 border-t border-slate-200">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Total HT</span>
              <span>{formatCurrency(quote.costs.price_ht)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-400">
              <span>TVA (20%)</span>
              <span>{formatCurrency(quote.costs.price_ttc - quote.costs.price_ht)}</span>
            </div>
            <div className="flex justify-between font-bold text-base text-slate-900 pt-1.5 border-t border-slate-200">
              <span>Total TTC</span>
              <span>{formatCurrency(quote.costs.price_ttc)}</span>
            </div>
            <p
              className={`text-xs ${
                quote.costs.margin_rate >= 0.35 ? 'text-green-600' : 'text-amber-600'
              }`}
            >
              Marge : {Math.round(quote.costs.margin_rate * 100)}%
            </p>
          </div>

          {/* Signature zone */}
          <div className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center mt-2">
            <p className="text-xs text-slate-400">Zone de signature électronique</p>
            <p className="text-xs text-slate-300 mt-0.5">Envoyé via SignNow</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={onRegenerate}>
          <RefreshCw className="w-3.5 h-3.5" /> Régénérer
        </Button>
        {quote.status === 'brouillon' && (
          <Button
            size="sm"
            className="gap-1.5 flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => onSend(quote.id)}
            disabled={sendingQuoteId !== null}
          >
            {sendingQuoteId === quote.id ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Envoi via Docuseal...
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" /> Envoyer via Docuseal →
              </>
            )}
          </Button>
        )}
        {quote.status === 'envoye' && (
          <Button
            size="sm"
            className="gap-1.5 flex-1 bg-green-600 hover:bg-green-700 text-white"
            disabled
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Envoyé
          </Button>
        )}
      </div>

      <button
        onClick={onBackToList}
        className="w-full text-center text-xs text-slate-400 hover:text-slate-600 transition-colors py-1"
      >
        ← Retour à la liste des devis
      </button>
    </div>
  )
}
