'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { track } from '@/lib/analytics/posthog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StepCard } from './StepCard'
import { INVITE_ROLE_LABELS_FR } from '@/lib/onboarding/defaults'
import { inviteTeam, skipTeam } from '@/app/actions/onboarding'

type InviteRole = 'admin' | 'sales' | 'agent'

interface InviteRow {
  id: string
  first_name: string
  last_name: string
  email: string
  role: InviteRole
}

function newRow(): InviteRow {
  return {
    id: crypto.randomUUID(),
    first_name: '',
    last_name: '',
    email: '',
    role: 'admin',
  }
}

const MAX_ROWS = 5

export function Step2InviteTeam() {
  const router = useRouter()
  const [rows, setRows] = useState<InviteRow[]>([newRow()])
  const [pendingInvite, startInvite] = useTransition()
  const [pendingSkip, startSkip] = useTransition()

  function updateRow(id: string, patch: Partial<InviteRow>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function addRow() {
    setRows((rs) => (rs.length >= MAX_ROWS ? rs : [...rs, newRow()]))
  }

  function removeRow(id: string) {
    setRows((rs) => (rs.length === 1 ? rs : rs.filter((r) => r.id !== id)))
  }

  function handleInvite() {
    const cleaned = rows
      .map((r) => ({
        first_name: r.first_name.trim() || undefined,
        last_name: r.last_name.trim() || undefined,
        email: r.email.trim().toLowerCase(),
        role: r.role,
      }))
      .filter((r) => r.email)

    if (cleaned.length === 0) {
      toast.error('Ajoute au moins un email pour envoyer une invitation.')
      return
    }

    const fd = new FormData()
    fd.append('payload', JSON.stringify({ invites: cleaned }))
    startInvite(async () => {
      const res = await inviteTeam(fd)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      track('onboarding_step_completed', { step: 2, action: 'invite_team', count: cleaned.length })
      toast.success(res.message ?? 'Invitations envoyées.')
      router.push('/onboarding/3')
    })
  }

  function handleSkip() {
    startSkip(async () => {
      const res = await skipTeam()
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      track('onboarding_step_skipped', { step: 2 })
      router.push('/onboarding/3')
    })
  }

  const isBusy = pendingInvite || pendingSkip

  return (
    <StepCard
      title="Veux-tu inviter tes collaborateurs ?"
      description="Tu peux inviter ton équipe maintenant ou le faire plus tard depuis les paramètres."
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <button
            type="button"
            onClick={handleSkip}
            disabled={isBusy}
            className="text-[13px] text-slate-500 hover:text-slate-700 disabled:opacity-50 underline-offset-2 hover:underline"
          >
            {pendingSkip ? 'Passage...' : 'Passer cette étape'}
          </button>
          <Button onClick={handleInvite} disabled={isBusy} className="bg-indigo-600 hover:bg-indigo-700">
            {pendingInvite ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Envoi...
              </>
            ) : (
              'Inviter mon équipe'
            )}
          </Button>
        </div>
      }
    >
      <p className="text-[12px] text-slate-500 mb-3">
        <span className="text-rose-500">*</span> Champs obligatoires
      </p>

      <div className="space-y-3 sm:space-y-4">
        {rows.map((row, idx) => (
          <div
            key={row.id}
            className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 sm:p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-slate-600">Collaborateur {idx + 1}</span>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  disabled={isBusy}
                  className="text-slate-400 hover:text-rose-500 transition-colors"
                  aria-label="Supprimer ce collaborateur"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor={`fn-${row.id}`} className="text-[12px]">Prénom</Label>
                <Input
                  id={`fn-${row.id}`}
                  value={row.first_name}
                  onChange={(e) => updateRow(row.id, { first_name: e.target.value })}
                  disabled={isBusy}
                  className="mt-1"
                  maxLength={100}
                />
              </div>
              <div>
                <Label htmlFor={`ln-${row.id}`} className="text-[12px]">Nom</Label>
                <Input
                  id={`ln-${row.id}`}
                  value={row.last_name}
                  onChange={(e) => updateRow(row.id, { last_name: e.target.value })}
                  disabled={isBusy}
                  className="mt-1"
                  maxLength={100}
                />
              </div>
            </div>

            <div>
              <Label htmlFor={`em-${row.id}`} className="text-[12px]">
                Email professionnel <span className="text-rose-500">*</span>
              </Label>
              <Input
                id={`em-${row.id}`}
                type="email"
                value={row.email}
                onChange={(e) => updateRow(row.id, { email: e.target.value })}
                disabled={isBusy}
                className="mt-1"
                placeholder="prenom.nom@entreprise.fr"
              />
            </div>

            <div>
              <Label htmlFor={`ro-${row.id}`} className="text-[12px]">
                Rôle <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={row.role}
                onValueChange={(v) => updateRow(row.id, { role: v as InviteRole })}
                disabled={isBusy}
              >
                <SelectTrigger id={`ro-${row.id}`} className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
                {INVITE_ROLE_LABELS_FR[row.role]}
              </p>
            </div>
          </div>
        ))}

        {rows.length < MAX_ROWS && (
          <button
            type="button"
            onClick={addRow}
            disabled={isBusy}
            className="inline-flex items-center gap-1.5 text-[13px] text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Ajouter un collaborateur
          </button>
        )}
      </div>
    </StepCard>
  )
}
