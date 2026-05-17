'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  createInvitation,
  listInvitations,
  resendInvitation,
  revokeInvitation,
  type InvitationRow,
} from '@/app/actions/invitations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Mail, RotateCcw, X, Loader2, Send } from 'lucide-react'
import { ROLE_LABELS } from '@/lib/auth'
import { toast } from 'sonner'
import { useCurrentRole } from '@/lib/auth'

const ROLE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'admin', label: ROLE_LABELS.admin },
  { value: 'agent', label: ROLE_LABELS.agent },
  { value: 'ops_manager', label: ROLE_LABELS.ops_manager },
  { value: 'sales', label: ROLE_LABELS.sales },
  { value: 'accountant', label: ROLE_LABELS.accountant },
  { value: 'viewer', label: ROLE_LABELS.viewer },
]

const STATUS_LABELS: Record<InvitationRow['status'], string> = {
  pending: 'En attente',
  accepted: 'Acceptée',
  expired: 'Expirée',
  revoked: 'Révoquée',
}

const STATUS_COLORS: Record<InvitationRow['status'], string> = {
  pending: 'bg-amber-100 text-amber-900 border-amber-200',
  accepted: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  expired: 'bg-slate-100 text-slate-700 border-slate-200',
  revoked: 'bg-rose-100 text-rose-900 border-rose-200',
}

export function InvitationsPanel() {
  const role = useCurrentRole()
  const canInvite = role === 'owner' || role === 'admin'
  const [pending, startTransition] = useTransition()
  const [invitations, setInvitations] = useState<InvitationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ email: '', role: 'admin', first_name: '', last_name: '' })

  async function refresh() {
    const rows = await listInvitations()
    setInvitations(rows)
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    listInvitations().then(rows => {
      if (cancelled) return
      setInvitations(rows)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fd = new FormData()
    fd.set('email', form.email)
    fd.set('role', form.role)
    if (form.first_name) fd.set('first_name', form.first_name)
    if (form.last_name) fd.set('last_name', form.last_name)

    startTransition(async () => {
      const res = await createInvitation(fd)
      if (res.ok) {
        toast.success(res.message ?? 'Invitation envoyée')
        setForm({ email: '', role: 'admin', first_name: '', last_name: '' })
        refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  function handleRevoke(id: string) {
    startTransition(async () => {
      const res = await revokeInvitation(id)
      if (res.ok) {
        toast.success(res.message ?? 'Invitation révoquée')
        refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  function handleResend(id: string) {
    startTransition(async () => {
      const res = await resendInvitation(id)
      if (res.ok) {
        toast.success(res.message ?? 'Email renvoyé')
        refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  if (!canInvite) {
    return (
      <Card className="max-w-2xl">
        <CardContent className="py-6 text-sm text-slate-600">
          Seuls les propriétaires et administrateurs peuvent inviter des collaborateurs.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inviter un collaborateur</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="invite-first-name">Prénom (optionnel)</Label>
                <Input
                  id="invite-first-name"
                  value={form.first_name}
                  onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                  placeholder="Marie"
                  disabled={pending}
                />
              </div>
              <div>
                <Label htmlFor="invite-last-name">Nom (optionnel)</Label>
                <Input
                  id="invite-last-name"
                  value={form.last_name}
                  onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                  placeholder="Dupont"
                  disabled={pending}
                />
              </div>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
              <div>
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="prenom@entreprise.fr"
                  disabled={pending}
                />
              </div>
              <div className="w-40">
                <Label htmlFor="invite-role">Rôle</Label>
                <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))} disabled={pending}>
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={pending} className="gap-2">
              {pending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Envoi…</>
              ) : (
                <><Send className="w-4 h-4" /> Envoyer l'invitation</>
              )}
            </Button>
            <p className="text-[11px] text-slate-500">
              Un lien magique est envoyé par email. L'invité finalise son profil en cliquant le lien (valable 7 jours).
            </p>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Invitations
            <span className="text-xs text-slate-500 font-normal">({invitations.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500">Chargement…</p>
          ) : invitations.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune invitation pour l'instant.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Expire</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map(inv => (
                  <TableRow key={inv.id}>
                    <TableCell className="text-sm">
                      <div className="font-medium">{inv.email}</div>
                      {(inv.first_name || inv.last_name) && (
                        <div className="text-xs text-slate-500">
                          {[inv.first_name, inv.last_name].filter(Boolean).join(' ')}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{ROLE_LABELS[inv.role as keyof typeof ROLE_LABELS] ?? inv.role}</TableCell>
                    <TableCell>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[inv.status]}`}>
                        {STATUS_LABELS[inv.status]}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {new Date(inv.expires_at).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell className="text-right">
                      {inv.status === 'pending' && (
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResend(inv.id)}
                            disabled={pending}
                            title="Renvoyer l'email"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevoke(inv.id)}
                            disabled={pending}
                            title="Révoquer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
