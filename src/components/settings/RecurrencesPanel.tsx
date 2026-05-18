'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Plus, Repeat, Trash2 } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useCompanySites } from '@/lib/store'
import {
  createRecurrence,
  deactivateRecurrence,
  loadRecurrences,
  type RecurrenceListRow,
} from '@/app/actions/recurrences'

const FREQUENCY_LABELS: Record<'weekly' | 'biweekly' | 'monthly', string> = {
  weekly: 'Hebdomadaire',
  biweekly: 'Toutes les 2 semaines',
  monthly: 'Mensuel',
}

const WEEKDAY_LABELS = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.']

interface FormState {
  site_id: string
  service_type: string
  planned_hours: string
  start_time: string
  frequency: 'weekly' | 'biweekly' | 'monthly'
  weekday: string
  day_of_month: string
  starts_on: string
  ends_on: string
  notes: string
}

function emptyForm(): FormState {
  const today = new Date().toISOString().slice(0, 10)
  return {
    site_id: '',
    service_type: '',
    planned_hours: '2',
    start_time: '09:00',
    frequency: 'weekly',
    weekday: '1',
    day_of_month: '',
    starts_on: today,
    ends_on: '',
    notes: '',
  }
}

export function RecurrencesPanel() {
  const sites = useCompanySites()
  const [rows, setRows] = useState<RecurrenceListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [pending, startSubmit] = useTransition()
  const [deactivating, startDeactivate] = useTransition()
  const [confirmDeactivateId, setConfirmDeactivateId] = useState<string | null>(null)

  // Bumping this counter from anywhere in the component triggers a refetch.
  // We keep the actual fetch inside the effect so React 19's strict
  // set-state-in-effect rule doesn't fire — refresh just nudges the deps.
  const [refreshTick, setRefreshTick] = useState(0)
  const refresh = () => setRefreshTick((t) => t + 1)

  useEffect(() => {
    let cancelled = false
    loadRecurrences()
      .then((data) => {
        if (!cancelled) setRows(data)
      })
      .catch(() => {
        if (!cancelled) toast.error('Impossible de charger les récurrences.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [refreshTick])

  function update(patch: Partial<FormState>) {
    setForm((f) => ({ ...f, ...patch }))
  }

  function handleSubmit() {
    if (!form.site_id) {
      toast.error('Sélectionne un site.')
      return
    }
    const hours = Number(form.planned_hours.replace(',', '.'))
    if (!Number.isFinite(hours) || hours <= 0) {
      toast.error('Durée invalide.')
      return
    }
    const payload = {
      site_id: form.site_id,
      service_type: form.service_type.trim() || undefined,
      planned_hours: hours,
      start_time: form.start_time,
      frequency: form.frequency,
      weekday: form.frequency === 'monthly' ? null : Number(form.weekday),
      day_of_month: form.frequency === 'monthly' ? Number(form.day_of_month || '1') : null,
      starts_on: form.starts_on,
      ends_on: form.ends_on || null,
      notes: form.notes.trim() || null,
    }
    const fd = new FormData()
    fd.append('payload', JSON.stringify(payload))
    startSubmit(async () => {
      const res = await createRecurrence(fd)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success(res.message ?? 'Récurrence créée.')
      setShowForm(false)
      setForm(emptyForm())
      refresh()
    })
  }

  function handleDeactivate() {
    if (!confirmDeactivateId) return
    const id = confirmDeactivateId
    startDeactivate(async () => {
      const res = await deactivateRecurrence(id)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success('Récurrence désactivée.')
      setConfirmDeactivateId(null)
      refresh()
    })
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Missions récurrentes</CardTitle>
            <p className="text-[12px] text-slate-500 mt-1">
              Auto-génération des missions hebdo / mensuelles. Le cron crée les
              prochaines missions 4 semaines à l&apos;avance.
            </p>
          </div>
          <Button
            onClick={() => {
              setForm(emptyForm())
              setShowForm(true)
            }}
            className="gap-2"
          >
            <Plus className="w-4 h-4" /> Nouvelle récurrence
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 flex items-center justify-center text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center">
              <Repeat className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-[13px] text-slate-500">
                Aucune récurrence configurée. Crée-en une pour automatiser tes
                missions répétitives.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((row) => (
                <li key={row.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[13px] font-medium text-slate-900 truncate">
                        {row.site_name ?? '(site supprimé)'}
                      </span>
                      {!row.is_active && (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">
                          Désactivée
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      {FREQUENCY_LABELS[row.frequency]}
                      {row.frequency !== 'monthly' && row.weekday !== null && (
                        <> · {WEEKDAY_LABELS[row.weekday]}</>
                      )}
                      {row.frequency === 'monthly' && row.day_of_month !== null && (
                        <> · le {row.day_of_month} du mois</>
                      )}
                      {row.start_time && <> · {row.start_time.slice(0, 5)}</>}
                      {row.planned_hours && <> · {row.planned_hours}h</>}
                      {row.service_type && <> · {row.service_type}</>}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Démarre {row.starts_on}
                      {row.ends_on && <> → fin {row.ends_on}</>}
                      {row.last_generated_date && (
                        <> · dernière génération {row.last_generated_date}</>
                      )}
                    </p>
                  </div>
                  {row.is_active && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDeactivateId(row.id)}
                      disabled={deactivating}
                      className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 -mt-1"
                      aria-label="Désactiver"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle mission récurrente</DialogTitle>
            <p className="text-[12px] text-slate-500">
              Les 4 prochaines missions sont créées immédiatement. Le cron
              ajoute la suite au fur et à mesure.
            </p>
          </DialogHeader>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <Label className="text-[12px]">Site <span className="text-rose-500">*</span></Label>
              <Select value={form.site_id} onValueChange={(v) => update({ site_id: v })} disabled={pending}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[12px]">Type de prestation</Label>
              <Input
                value={form.service_type}
                onChange={(e) => update({ service_type: e.target.value })}
                disabled={pending}
                placeholder="ex : Nettoyage bureaux"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[12px]">Heure de début</Label>
                <Input
                  type="time"
                  value={form.start_time}
                  onChange={(e) => update({ start_time: e.target.value })}
                  disabled={pending}
                />
              </div>
              <div>
                <Label className="text-[12px]">Durée (heures)</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={form.planned_hours}
                  onChange={(e) => update({ planned_hours: e.target.value })}
                  disabled={pending}
                />
              </div>
            </div>
            <div>
              <Label className="text-[12px]">Fréquence</Label>
              <Select
                value={form.frequency}
                onValueChange={(v) => update({ frequency: v as 'weekly' | 'biweekly' | 'monthly' })}
                disabled={pending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Hebdomadaire</SelectItem>
                  <SelectItem value="biweekly">Toutes les 2 semaines</SelectItem>
                  <SelectItem value="monthly">Mensuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.frequency !== 'monthly' ? (
              <div>
                <Label className="text-[12px]">Jour de la semaine</Label>
                <Select
                  value={form.weekday}
                  onValueChange={(v) => update({ weekday: v })}
                  disabled={pending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEEKDAY_LABELS.map((label, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label className="text-[12px]">Jour du mois (1-31)</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={form.day_of_month}
                  onChange={(e) => update({ day_of_month: e.target.value })}
                  disabled={pending}
                  placeholder="ex : 15"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[12px]">Démarre le</Label>
                <Input
                  type="date"
                  value={form.starts_on}
                  onChange={(e) => update({ starts_on: e.target.value })}
                  disabled={pending}
                />
              </div>
              <div>
                <Label className="text-[12px]">Fin (optionnel)</Label>
                <Input
                  type="date"
                  value={form.ends_on}
                  onChange={(e) => update({ ends_on: e.target.value })}
                  disabled={pending}
                />
              </div>
            </div>
            <div>
              <Label className="text-[12px]">Notes</Label>
              <Input
                value={form.notes}
                onChange={(e) => update({ notes: e.target.value })}
                disabled={pending}
                maxLength={1000}
                placeholder="Notes internes (optionnel)"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={pending}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={pending} className="gap-2">
              {pending && <Loader2 className="w-4 h-4 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDeactivateId !== null}
        onOpenChange={(open) => { if (!open) setConfirmDeactivateId(null) }}
        title="Désactiver cette récurrence ?"
        description="Les missions déjà générées restent. Aucune nouvelle mission ne sera créée pour cette récurrence après désactivation."
        confirmLabel="Désactiver"
        variant="destructive"
        onConfirm={handleDeactivate}
      />
    </div>
  )
}
