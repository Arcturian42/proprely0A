import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Mission, OperationalMissionStatus } from '@/types'
import { LEGACY_TO_OPERATIONAL } from './constants'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Renvoie le statut opérationnel d'une mission, en repliant sur le mapping
 * legacy `status` → `operational_status` si le champ n'est pas encore renseigné.
 */
export function getOperationalStatus(mission: Mission): OperationalMissionStatus {
  if (mission.operational_status) return mission.operational_status
  return (LEGACY_TO_OPERATIONAL[mission.status] ?? 'planifie') as OperationalMissionStatus
}

export function initials(firstName?: string | null, lastName?: string | null): string {
  return `${firstName?.[0] ?? '?'}${lastName?.[0] ?? ''}`.toUpperCase()
}

export function formatHours(h: number): string {
  if (Number.isInteger(h)) return `${h}h`
  return `${Math.floor(h)}h${String(Math.round((h % 1) * 60)).padStart(2, '0')}`
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

export function formatTime(time: string) {
  return time.substring(0, 5)
}
