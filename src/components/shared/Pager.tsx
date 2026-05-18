'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PagerProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  /** Optional label for screen readers / sm screens, e.g. "agents", "missions". */
  label?: string
}

/**
 * In-memory pager — slices an array client-side. Use with usePagination()
 * for state management. Pure presentational, no fetching.
 */
export function Pager({ page, pageSize, total, onPageChange, label }: PagerProps) {
  if (total <= pageSize) return null

  const totalPages = Math.ceil(total / pageSize)
  const safePage = Math.max(1, Math.min(page, totalPages))
  const from = (safePage - 1) * pageSize + 1
  const to = Math.min(safePage * pageSize, total)

  return (
    <nav
      aria-label={label ? `Pagination ${label}` : 'Pagination'}
      className="flex items-center justify-between gap-3 pt-3 mt-3 border-t border-slate-100 text-[12px]"
    >
      <span className="text-slate-500">
        {from}–{to} sur {total}
      </span>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage === 1}
          aria-label="Page précédente"
          className="h-7 w-7 p-0"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="text-slate-500 px-2 tabular-nums">
          {safePage} / {totalPages}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage === totalPages}
          aria-label="Page suivante"
          className="h-7 w-7 p-0"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </nav>
  )
}

/**
 * Slices an array for the current page. Use alongside usePagination().
 */
export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize
  return items.slice(start, start + pageSize)
}
