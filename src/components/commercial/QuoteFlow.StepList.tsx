import { motion } from 'framer-motion'
import {
  CheckCircle2,
  Eye,
  FileText,
  Loader2,
  Plus,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Quote } from '@/types'
import { QuoteStatusBadge } from './QuoteFlow.shared'

// Step 0 — list of existing quotes attached to an opportunity. Extracted
// from QuoteFlow.tsx (was an inline component) for readability + future
// reuse from /commercial/pipeline.

interface Props {
  oppQuotes: Quote[]
  onNew: () => void
  onSend: (id: string) => void
  onDelete: (id: string) => void
  onPreview: (id: string) => void
  sendingQuoteId: string | null
}

export function StepList({
  oppQuotes,
  onNew,
  onSend,
  onDelete,
  onPreview,
  sendingQuoteId,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Devis ({oppQuotes.length})</h3>
        <Button size="sm" onClick={onNew} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-3.5 h-3.5" /> Créer un devis
        </Button>
      </div>

      {oppQuotes.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
          <FileText className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">Aucun devis</p>
          <p className="text-xs text-slate-400 mt-1">Créez votre premier devis multi-services</p>
          <Button
            size="sm"
            className="mt-4 gap-1.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white"
            onClick={onNew}
          >
            <Sparkles className="w-3.5 h-3.5" /> Nouveau devis IA
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {oppQuotes.map((q) => (
            <motion.div
              key={q.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-200 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-mono text-slate-500">{q.quote_number}</span>
                    <QuoteStatusBadge status={q.status} />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 truncate">{q.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{formatDate(q.created_at)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-base font-bold text-slate-900">
                    {formatCurrency(q.costs.price_ttc)}
                  </p>
                  <p className="text-xs text-slate-500">TTC</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 flex-wrap">
                <div className="flex-1 text-xs text-slate-500">
                  Marge:{' '}
                  <span className="font-medium text-green-600">
                    {Math.round(q.costs.margin_rate * 100)}%
                  </span>
                  {q.surface_m2 && <span className="ml-2">• {q.surface_m2} m²</span>}
                </div>
                {q.status === 'brouillon' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => onPreview(q.id)}
                    >
                      <Eye className="w-3 h-3" /> Aperçu
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => onSend(q.id)}
                      disabled={sendingQuoteId !== null}
                    >
                      {sendingQuoteId === q.id ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" /> Envoi...
                        </>
                      ) : (
                        <>
                          <Send className="w-3 h-3" /> Envoyer
                        </>
                      )}
                    </Button>
                  </>
                )}
                {q.status === 'envoye' && (
                  <Badge className="bg-orange-100 text-orange-700 text-xs border-0">
                    En attente signature
                  </Badge>
                )}
                {q.status === 'signe' && (
                  <Badge className="bg-green-100 text-green-700 text-xs gap-1 border-0">
                    <CheckCircle2 className="w-3 h-3" /> Signé
                  </Badge>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                  onClick={() => onDelete(q.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
