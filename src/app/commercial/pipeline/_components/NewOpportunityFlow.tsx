'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAppStore } from '@/lib/store'
import { useCurrentCompanyId } from '@/lib/auth'
import { Opportunity } from '@/types'
import { NEXT_ACTION_TYPE_LABELS } from '@/lib/constants'
import { toast } from 'sonner'
import type { CompanyHit } from '@/app/api/sirene/search/route'
import {
  ArrowLeft, ArrowRight, X, Search, Loader2, Check, Building2, User as UserIcon,
  Calendar, Phone, Mail, MapPin, FileText, RotateCw, ListChecks, Sparkles,
  AlertCircle, Edit3,
} from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface CompanyDraft {
  source: 'sirene_api' | 'manual'
  name: string
  siren: string | null
  siret: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  naf_code: string | null
  legal_form: string | null
  company_status: string | null
}

interface ContactDraft {
  first_name: string
  last_name: string
  role: string
  email: string
  phone: string
}

interface ActionDraft {
  type: string
  date: string // YYYY-MM-DD
  note: string
}

const EMPTY_CONTACT: ContactDraft = { first_name: '', last_name: '', role: '', email: '', phone: '' }
const EMPTY_ACTION: ActionDraft = { type: 'call', date: '', note: '' }

const ACTION_TYPES: Array<{ value: string; icon: React.ElementType }> = [
  { value: 'call', icon: Phone },
  { value: 'email', icon: Mail },
  { value: 'site_visit', icon: MapPin },
  { value: 'proposal', icon: FileText },
  { value: 'follow_up', icon: RotateCw },
  { value: 'meeting', icon: Calendar },
  { value: 'qualification', icon: ListChecks },
]

export function NewOpportunityFlow({ open, onOpenChange }: Props) {
  const { opportunities, addOpportunity } = useAppStore()
  const companyId = useCurrentCompanyId()
  const [step, setStep] = useState(0)
  const [company, setCompany] = useState<CompanyDraft | null>(null)
  const [contact, setContact] = useState<ContactDraft>(EMPTY_CONTACT)
  const [action, setAction] = useState<ActionDraft>(EMPTY_ACTION)

  // Reset when closed.
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setStep(0)
        setCompany(null)
        setContact(EMPTY_CONTACT)
        setAction(EMPTY_ACTION)
      }, 250)
      return () => clearTimeout(t)
    }
  }, [open])

  const duplicate = useMemo(() => {
    if (!company?.siret) return null
    return opportunities.find((o) => o.siret === company.siret) || null
  }, [company, opportunities])

  const canContinueFromStep1 = !!company && company.name.trim().length > 0
  const isLast = step === 2

  const handleCreate = () => {
    if (!company) return
    const now = new Date().toISOString()
    const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(' ').trim()
    const opp: Opportunity = {
      id: `opp-${Date.now()}`,
      company_id: companyId,
      lead_id: null,
      client_id: null,
      site_id: null,
      title: company.name,
      prospect_name: company.name,
      contact_name: fullName || null,
      contact_role: contact.role.trim() || null,
      email: contact.email.trim() || null,
      phone: contact.phone.trim() || null,
      city: company.city,
      postal_code: company.postal_code,
      site_address: company.address,
      client_type: null,
      service_type: null,
      estimated_amount: null,
      stage: 'ouvert',
      next_action_date: action.date ? new Date(action.date).toISOString() : null,
      next_action_type: action.type || null,
      next_action_note: action.note.trim() || null,
      notes: null,
      siren: company.siren,
      siret: company.siret,
      naf_code: company.naf_code,
      legal_form: company.legal_form,
      company_status: company.company_status,
      source: company.source,
      status: 'ouvert',
      converted_to_client: false,
      converted_at: null,
      created_at: now,
      updated_at: now,
    }
    addOpportunity(opp)
    toast.success(`${company.name} ajouté dans "Ouvert"`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden border-0 bg-transparent shadow-none">
        <div className="prospect-shell relative rounded-2xl overflow-hidden">
          <div className="p-7 text-slate-900">
            <Header step={step} onClose={() => onOpenChange(false)} />
            <ProgressBar step={step} />

            <div className="min-h-[300px] animate-fade-up">
              {step === 0 && (
                <Step1Company
                  company={company}
                  setCompany={setCompany}
                  duplicate={duplicate}
                />
              )}
              {step === 1 && <Step2Contact contact={contact} setContact={setContact} />}
              {step === 2 && <Step3Action action={action} setAction={setAction} />}
            </div>

            <Footer
              step={step}
              isLast={isLast}
              canContinue={step === 0 ? canContinueFromStep1 : true}
              onBack={() => setStep((s) => Math.max(0, s - 1))}
              onNext={() => setStep((s) => Math.min(2, s + 1))}
              onSubmit={handleCreate}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Header({ step, onClose }: { step: number; onClose: () => void }) {
  const titles = ['Entreprise', 'Contact', 'Prochaine action']
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <Sparkles className="w-3.5 h-3.5 text-violet-500" />
        Nouvelle opportunité · {titles[step]}
      </div>
      <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="mb-6">
      <div className="h-1 w-full bg-slate-200/70 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 transition-all duration-500"
          style={{ width: `${((step + 1) / 3) * 100}%` }}
        />
      </div>
    </div>
  )
}

function Footer({
  step, isLast, canContinue, onBack, onNext, onSubmit,
}: {
  step: number
  isLast: boolean
  canContinue: boolean
  onBack: () => void
  onNext: () => void
  onSubmit: () => void
}) {
  return (
    <div className="mt-7 flex items-center justify-between">
      <Button variant="ghost" size="sm" onClick={onBack} disabled={step === 0} className="gap-1">
        <ArrowLeft className="w-3.5 h-3.5" /> Retour
      </Button>
      {!isLast ? (
        <Button
          onClick={onNext}
          disabled={!canContinue}
          className="gap-1 bg-slate-900 hover:bg-slate-800"
        >
          Continuer <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      ) : (
        <Button
          onClick={onSubmit}
          className="gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-violet-500/20"
        >
          <Check className="w-4 h-4" /> Créer l&apos;opportunité
        </Button>
      )}
    </div>
  )
}

// ── Step 1 ──────────────────────────────────────────────────────────────────

function Step1Company({
  company, setCompany, duplicate,
}: {
  company: CompanyDraft | null
  setCompany: (c: CompanyDraft | null) => void
  duplicate: Opportunity | null
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CompanyHit[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [manualName, setManualName] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  // Debounced fetch — the clear-on-short-query case is queued as a microtask
  // so we never call setState synchronously inside the effect body (would
  // trigger react-hooks/set-state-in-effect cascade-render warning).
  useEffect(() => {
    if (manualMode || company) return
    const q = query.trim()
    if (q.length < 2) {
      queueMicrotask(() => setResults(null))
      return
    }
    const t = setTimeout(async () => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      setLoading(true)
      try {
        const res = await fetch(`/api/sirene/search?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        })
        const json = (await res.json()) as { results: CompanyHit[] }
        setResults(json.results || [])
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setResults([])
      } finally {
        setLoading(false)
      }
    }, 280)
    return () => clearTimeout(t)
  }, [query, manualMode, company])

  const selectCompany = (hit: CompanyHit) => {
    setCompany({
      source: 'sirene_api',
      name: hit.name,
      siren: hit.siren,
      siret: hit.siret,
      address: hit.address,
      city: hit.city,
      postal_code: hit.postal_code,
      naf_code: hit.naf_code,
      legal_form: hit.legal_form,
      company_status: hit.company_status,
    })
  }

  const confirmManual = () => {
    const name = manualName.trim()
    if (!name) return
    setCompany({
      source: 'manual',
      name,
      siren: null,
      siret: null,
      address: null,
      city: null,
      postal_code: null,
      naf_code: null,
      legal_form: null,
      company_status: null,
    })
  }

  // ── Render selected company card
  if (company) {
    return (
      <div className="space-y-3">
        <SelectedCompanyCard company={company} onClear={() => setCompany(null)} />
        {duplicate && (
          <div className="flex items-start gap-2 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-2.5">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <div>
              Une opportunité existe déjà pour ce SIRET&nbsp;:{' '}
              <span className="font-semibold">{duplicate.title}</span>. Vous pouvez quand
              même créer une 2ᵉ opportunité.
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Manual entry mode
  if (manualMode) {
    return (
      <div className="space-y-3">
        <Label className="text-xs text-slate-600">Nom de l&apos;entreprise</Label>
        <Input
          autoFocus
          value={manualName}
          onChange={(e) => setManualName(e.target.value)}
          placeholder="Ex: Boulangerie du coin"
          onKeyDown={(e) => { if (e.key === 'Enter') confirmManual() }}
          className="bg-white/70 backdrop-blur border-slate-200"
        />
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => { setManualMode(false); setManualName('') }}>
            Annuler
          </Button>
          <Button size="sm" onClick={confirmManual} disabled={!manualName.trim()}>
            Confirmer
          </Button>
        </div>
        <p className="text-xs text-slate-500">
          Cette entreprise sera marquée &laquo;&nbsp;saisie manuelle&nbsp;&raquo;. Aucun
          type client ne sera assigné automatiquement.
        </p>
      </div>
    )
  }

  // ── Search mode
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs text-slate-600">Rechercher l&apos;entreprise</Label>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom, SIREN ou SIRET…"
            className="bg-white/70 backdrop-blur border-slate-200 pl-9"
          />
          {loading && (
            <Loader2 className="w-4 h-4 text-violet-500 absolute right-3 top-1/2 -translate-y-1/2 animate-spin" />
          )}
        </div>
      </div>

      <div className="min-h-[180px]">
        {results === null && !loading && (
          <div className="text-xs text-slate-500 px-1">
            Tapez au moins 2 caractères pour interroger la base SIRENE.
          </div>
        )}

        {results && results.length === 0 && !loading && (
          <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl">
            <p className="text-sm text-slate-700 mb-1">Aucune entreprise trouvée</p>
            <p className="text-xs text-slate-500 mb-3">
              Vous pouvez créer une opportunité en saisie manuelle.
            </p>
            <Button size="sm" variant="outline" onClick={() => { setManualMode(true); setManualName(query) }}>
              <Edit3 className="w-3.5 h-3.5 mr-1" /> Saisie manuelle
            </Button>
          </div>
        )}

        {results && results.length > 0 && (
          <ul className="space-y-1.5">
            {results.map((hit) => (
              <li key={hit.siren}>
                <button
                  onClick={() => selectCompany(hit)}
                  className="w-full text-left rounded-xl border border-slate-200 bg-white/70 hover:bg-white hover:border-violet-300 transition p-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900 truncate">{hit.name}</p>
                        {hit.siret && (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5">
                            SIRET
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        {[hit.naf_label, [hit.postal_code, hit.city].filter(Boolean).join(' ')]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {results && results.length > 0 && (
        <button
          onClick={() => { setManualMode(true); setManualName(query) }}
          className="text-xs text-slate-500 hover:text-slate-700 underline-offset-2 hover:underline"
        >
          Mon entreprise n&apos;est pas dans la liste — saisie manuelle
        </button>
      )}
    </div>
  )
}

function SelectedCompanyCard({
  company, onClear,
}: { company: CompanyDraft; onClear: () => void }) {
  return (
    <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/60 to-indigo-50/60 p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-white border border-violet-200 flex items-center justify-center flex-shrink-0">
          <Building2 className="w-5 h-5 text-violet-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-slate-900 truncate">{company.name}</p>
            {company.source === 'sirene_api' ? (
              <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5 font-medium">
                <Check className="w-2.5 h-2.5 inline -mt-0.5" /> SIRENE
              </span>
            ) : (
              <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5 font-medium">
                Saisie manuelle
              </span>
            )}
          </div>
          {(company.address || company.city) && (
            <p className="text-xs text-slate-500 mt-0.5">
              {[company.address, [company.postal_code, company.city].filter(Boolean).join(' ')]
                .filter(Boolean)
                .join(', ')}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {company.siret && (
              <Tag label="SIRET" value={company.siret} />
            )}
            {company.naf_code && (
              <Tag label="NAF" value={company.naf_code} />
            )}
            {company.legal_form && (
              <Tag label="Forme" value={company.legal_form} />
            )}
          </div>
        </div>
        <button
          onClick={onClear}
          className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded-md hover:bg-white/70"
        >
          Changer
        </button>
      </div>
    </div>
  )
}

function Tag({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-[10px] text-slate-600 bg-white/70 border border-slate-200 rounded-full px-2 py-0.5">
      <span className="text-slate-400">{label}</span> {value}
    </span>
  )
}

// ── Step 2 ──────────────────────────────────────────────────────────────────

function Step2Contact({
  contact, setContact,
}: { contact: ContactDraft; setContact: (c: ContactDraft) => void }) {
  const set = <K extends keyof ContactDraft>(k: K, v: ContactDraft[K]) =>
    setContact({ ...contact, [k]: v })

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
        <UserIcon className="w-3.5 h-3.5" />
        Optionnel — vous pourrez ajouter le contact plus tard.
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prénom">
          <Input
            value={contact.first_name}
            onChange={(e) => set('first_name', e.target.value)}
            placeholder="Marie"
          />
        </Field>
        <Field label="Nom">
          <Input
            value={contact.last_name}
            onChange={(e) => set('last_name', e.target.value)}
            placeholder="Dupont"
          />
        </Field>
        <Field label="Fonction" className="col-span-2">
          <Input
            value={contact.role}
            onChange={(e) => set('role', e.target.value)}
            placeholder="Office Manager, Gérant…"
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={contact.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="marie@entreprise.fr"
          />
        </Field>
        <Field label="Téléphone">
          <Input
            value={contact.phone}
            onChange={(e) => set('phone', e.target.value)}
            placeholder="06 12 34 56 78"
          />
        </Field>
      </div>
    </div>
  )
}

function Field({
  label, children, className,
}: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs text-slate-600 mb-1.5 block">{label}</Label>
      {children}
    </div>
  )
}

// ── Step 3 ──────────────────────────────────────────────────────────────────

function Step3Action({
  action, setAction,
}: { action: ActionDraft; setAction: (a: ActionDraft) => void }) {
  const set = <K extends keyof ActionDraft>(k: K, v: ActionDraft[K]) =>
    setAction({ ...action, [k]: v })

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs text-slate-600 mb-2 block">Type d&apos;action</Label>
        <div className="flex flex-wrap gap-1.5">
          {ACTION_TYPES.map((t) => {
            const Icon = t.icon
            const active = action.type === t.value
            return (
              <button
                key={t.value}
                onClick={() => set('type', t.value)}
                className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition ${
                  active
                    ? 'border-violet-400 bg-gradient-to-br from-violet-50 to-indigo-50 text-violet-900 shadow-sm'
                    : 'border-slate-200 bg-white/60 hover:border-slate-300 text-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {NEXT_ACTION_TYPE_LABELS[t.value] || t.value}
              </button>
            )
          })}
        </div>
      </div>

      <Field label="Date">
        <Input
          type="date"
          value={action.date}
          onChange={(e) => set('date', e.target.value)}
        />
      </Field>

      <Field label="À faire">
        <Textarea
          value={action.note}
          onChange={(e) => set('note', e.target.value)}
          rows={3}
          placeholder="Ex: Appeler l'office manager pour confirmer la fréquence de nettoyage."
        />
      </Field>
    </div>
  )
}
