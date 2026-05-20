'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  listCompanyMembers,
  setMemberActive,
  setMemberRole,
  type MemberRow,
} from '@/app/actions/members'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Users, UserCheck, UserX, Crown, Loader2 } from 'lucide-react'
import { ROLE_LABELS, isOwnerOrAdmin, useCurrentRole } from '@/lib/auth'
import { toast } from 'sonner'

const ASSIGNABLE_ROLES = ['admin', 'sales', 'agent'] as const

export function MembersPanel() {
  const role = useCurrentRole()
  const canManage = isOwnerOrAdmin(role)
  const isOwner = role === 'owner'
  const [members, setMembers] = useState<MemberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, startTransition] = useTransition()

  async function refresh() {
    const rows = await listCompanyMembers()
    setMembers(rows)
    setLoading(false)
  }

  useEffect(() => {
    let cancelled = false
    listCompanyMembers().then(rows => {
      if (cancelled) return
      setMembers(rows)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  function handleToggleActive(member: MemberRow) {
    startTransition(async () => {
      const res = await setMemberActive(member.id, !member.is_active)
      if (res.ok) {
        toast.success(res.message ?? 'Membre mis à jour')
        refresh()
      } else {
        toast.error(res.error)
      }
    })
  }

  function handleRoleChange(member: MemberRow, newRole: string) {
    if (newRole === member.role) return
    const fd = new FormData()
    fd.set('profile_id', member.id)
    fd.set('role', newRole)
    startTransition(async () => {
      const res = await setMemberRole(fd)
      if (res.ok) {
        toast.success(res.message ?? 'Rôle mis à jour')
        refresh()
      } else {
        toast.error(res.error)
        refresh() // revert UI to server truth
      }
    })
  }

  if (!canManage) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4" />
          Membres de l&apos;équipe
          <span className="text-xs text-slate-500 font-normal">
            ({members.filter(m => m.is_active).length} actif{members.filter(m => m.is_active).length > 1 ? 's' : ''} sur {members.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-slate-500">Chargement…</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun membre — invite ton équipe ci-dessus.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Membre</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map(m => {
                const fullName = [m.first_name, m.last_name].filter(Boolean).join(' ') || m.email
                const isOwnerRow = m.role === 'owner'
                const canEditRole = isOwner && !isOwnerRow && !m.is_self
                const canToggle = !isOwnerRow && !m.is_self
                  && (isOwner || m.role !== 'admin')

                return (
                  <TableRow key={m.id} className={!m.is_active ? 'opacity-60' : undefined}>
                    <TableCell>
                      <div className="text-sm font-medium flex items-center gap-1.5">
                        {fullName}
                        {isOwnerRow && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                        {m.is_self && <span className="text-[10px] uppercase tracking-wide text-slate-400">vous</span>}
                      </div>
                      <div className="text-xs text-slate-500">{m.email}</div>
                    </TableCell>
                    <TableCell>
                      {canEditRole ? (
                        <Select
                          value={m.role}
                          onValueChange={v => handleRoleChange(m, v)}
                          disabled={pending}
                        >
                          <SelectTrigger className="h-8 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ASSIGNABLE_ROLES.map(r => (
                              <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs">{ROLE_LABELS[m.role]}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border ${
                        m.is_active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {m.is_active ? 'Actif' : 'Désactivé'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {canToggle && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(m)}
                          disabled={pending}
                          title={m.is_active ? 'Désactiver (libère un siège)' : 'Réactiver'}
                          className="gap-1.5 text-xs"
                        >
                          {pending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : m.is_active ? (
                            <><UserX className="w-3.5 h-3.5" /> Désactiver</>
                          ) : (
                            <><UserCheck className="w-3.5 h-3.5" /> Réactiver</>
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
