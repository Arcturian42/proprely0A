'use client'

import { useCallback, useState } from 'react'

interface UsePaginationOptions {
  /** Defaults to 25. Tune per page based on row density. */
  pageSize?: number
  /** Total item count — used to clamp `page` if it overflows. */
  total: number
}

/**
 * Tiny pagination state: tracks `page` (1-indexed) and clamps on read when
 * total shrinks (e.g. after a delete). Clamping is derived, not state, so
 * we don't fight the React 19 set-state-in-effect rule.
 */
export function usePagination({ total, pageSize = 25 }: UsePaginationOptions) {
  const [rawPage, setRawPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(rawPage, totalPages)

  const setPage = useCallback(
    (next: number) => setRawPage(Math.max(1, next)),
    [],
  )
  const reset = useCallback(() => setRawPage(1), [])

  return { page, setPage, reset, pageSize }
}
