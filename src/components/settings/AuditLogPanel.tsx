'use client'

import { useEffect, useState } from 'react'
import { listAuditLogs, type AuditLogRow } from '@/app/actions/audit'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollText } from 'lucide-react'

const ACTION_LABELS: Record<AuditLogRow['action'], string> = {
  insert: 'Création',
  update: 'Modification',
  delete: 'Suppression',
}

const ACTION_COLORS: Record<AuditLogRow['action'], string> = {
  insert: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  update: 'bg-amber-50 text-amber-700 border-amber-200',
  delete: 'bg-rose-50 text-rose-700 border-rose-200',
}

const ENTITY_LABELS: Record<string, string> = {
  companies: 'Entreprise',
  profiles: 'Membre',
  missions: 'Mission',
  quotes: 'Devis',
  time_entries: 'Heure',
  invitations: 'Invitation',
}

/**
 * Read-only audit log viewer — what changed, who did it, when.
 * Backed by the audit_logs table populated by Postgres triggers (migration
 * 20260517000007). Owner/admin only via listAuditLogs gating.
 */
export function AuditLogPanel() {
  const [rows, setRows] = useState<AuditLogRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    listAuditLogs(100).then(data => {
      if (cancelled) return
      setRows(data)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ScrollText className="w-4 h-4" />
          Journal d&apos;audit
          <span className="text-xs text-slate-500 font-normal">({rows.length} dernières actions)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-slate-500">Chargement…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune activité enregistrée pour l&apos;instant.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Auteur</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entité</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.actor_name ?? <span className="text-slate-400">Système</span>}
                  </TableCell>
                  <TableCell>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border ${ACTION_COLORS[r.action]}`}>
                      {ACTION_LABELS[r.action]}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">
                    <span className="font-medium">{ENTITY_LABELS[r.entity_type] ?? r.entity_type}</span>
                    <span className="text-slate-400 ml-2 font-mono">#{r.entity_id.slice(0, 8)}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
