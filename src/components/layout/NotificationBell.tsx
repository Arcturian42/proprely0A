'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, AlertTriangle, AlertCircle, Info } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { isSupabaseClient } from '@/lib/supabase/client-config'
import { createClient } from '@/lib/supabase/client'
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/app/actions/notifications'
import type { AppNotification, NotificationSeverity } from '@/types'

// Pas de polling agressif : Realtime fait le travail temps-réel, le refetch
// périodique est juste un safety net (reconnexion réseau, etc.).
const POLL_FALLBACK_MS = 60_000

function severityIcon(severity: NotificationSeverity) {
  switch (severity) {
    case 'critical':
      return <AlertCircle className="w-4 h-4 text-red-600" aria-hidden />
    case 'warn':
      return <AlertTriangle className="w-4 h-4 text-amber-600" aria-hidden />
    default:
      return <Info className="w-4 h-4 text-slate-500" aria-hidden />
  }
}

function timeAgoFr(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const sec = Math.max(0, Math.floor(diffMs / 1000))
  if (sec < 60) return 'à l\'instant'
  const min = Math.floor(sec / 60)
  if (min < 60) return `il y a ${min} min`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `il y a ${hr} h`
  const days = Math.floor(hr / 24)
  if (days < 7) return `il y a ${days} j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<AppNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const mountedRef = useRef(true)

  const refresh = useCallback(async () => {
    if (!isSupabaseClient()) return
    setLoading(true)
    try {
      const res = await listNotifications()
      if (!mountedRef.current) return
      setItems(res.items)
      setUnread(res.unreadCount)
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  // Mount/unmount tracking + premier fetch. Le `react-hooks/set-state-in-effect`
  // tape ici car refresh() finit par appeler setState. Pattern acceptable :
  // on a *besoin* du fetch initial pour afficher le badge unread dès le
  // chargement de la sidebar — sinon l'utilisateur voit 0 jusqu'au prochain
  // event Realtime ou au tick de poll (60 s). Le coût d'un re-render après
  // mount est négligeable comparé à l'UX d'une cloche perpétuellement vide.
  useEffect(() => {
    mountedRef.current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
    return () => {
      mountedRef.current = false
    }
  }, [refresh])

  // Realtime subscription : on écoute les nouvelles notifications insérées
  // pour le user courant. RLS filtre déjà par recipient_id côté DB, mais
  // postgres_changes envoie tous les events à tous les listeners. On
  // refetch sur tout INSERT/UPDATE — c'est cheap et garantit la cohérence.
  useEffect(() => {
    if (!isSupabaseClient()) return
    const supabase = createClient()
    const channel = supabase
      .channel('notifications-bell')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        () => { void refresh() },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications' },
        () => { void refresh() },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [refresh])

  // Refetch périodique (filet de sécurité si Realtime est indisponible).
  useEffect(() => {
    if (!isSupabaseClient()) return
    const id = setInterval(() => void refresh(), POLL_FALLBACK_MS)
    return () => clearInterval(id)
  }, [refresh])

  const handleItemClick = useCallback(
    async (notif: AppNotification) => {
      if (!notif.read_at) {
        await markNotificationRead(notif.id)
        setUnread(u => Math.max(0, u - 1))
        setItems(arr => arr.map(n => (n.id === notif.id ? { ...n, read_at: new Date().toISOString() } : n)))
      }
      setOpen(false)
      if (notif.link_path) {
        router.push(notif.link_path)
      }
    },
    [router],
  )

  const handleMarkAll = useCallback(async () => {
    const res = await markAllNotificationsRead()
    if (res.ok) {
      const now = new Date().toISOString()
      setItems(arr => arr.map(n => (n.read_at ? n : { ...n, read_at: now })))
      setUnread(0)
    }
  }, [])

  // En mode dummy (pas de Supabase), on n'affiche même pas la cloche pour
  // éviter de promettre une feature qui ne marche pas.
  if (!isSupabaseClient()) return null

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={unread > 0 ? `Notifications (${unread} non lues)` : 'Notifications'}
          className="relative inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[#f7f6f3] transition-colors"
        >
          <Bell className="w-4 h-4 text-[#444]" aria-hidden />
          {unread > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
              aria-hidden
            >
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
          <p className="text-[13px] font-semibold text-slate-700">Notifications</p>
          {unread > 0 && (
            <button
              type="button"
              onClick={handleMarkAll}
              className="text-[11px] text-slate-500 hover:text-slate-700 inline-flex items-center gap-1"
            >
              <CheckCheck className="w-3 h-3" aria-hidden />
              Tout marquer lu
            </button>
          )}
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <Bell className="w-6 h-6 text-slate-300 mx-auto mb-2" aria-hidden />
              <p className="text-[12px] text-slate-500">
                {loading ? 'Chargement…' : 'Aucune notification.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map(notif => {
                const content = (
                  <div className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer">
                    <div className="pt-0.5">{severityIcon(notif.severity)}</div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-[13px] leading-snug',
                          notif.read_at ? 'text-slate-600' : 'text-slate-900 font-medium',
                        )}
                      >
                        {notif.title}
                      </p>
                      {notif.body && (
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{notif.body}</p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-1">{timeAgoFr(notif.created_at)}</p>
                    </div>
                    {!notif.read_at && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0"
                        aria-label="non lu"
                      />
                    )}
                  </div>
                )
                return (
                  <li key={notif.id}>
                    {notif.link_path ? (
                      <Link
                        href={notif.link_path}
                        onClick={e => {
                          e.preventDefault()
                          void handleItemClick(notif)
                        }}
                      >
                        {content}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => void handleItemClick(notif)}
                      >
                        {content}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
