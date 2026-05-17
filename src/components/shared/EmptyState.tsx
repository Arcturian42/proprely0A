import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { LucideIcon } from 'lucide-react'

/**
 * Branded empty-state block shown when a page has no data yet (typically a
 * fresh company that just signed up). Surfaces 1-2 CTAs to nudge the user
 * toward the action that fills the page.
 *
 * Sized for inline use inside an AdminLayout content area — not a full-page
 * takeover. Use directly in pages that conditionally render it.
 */
export interface EmptyStateAction {
  label: string
  href: string
  variant?: 'default' | 'outline'
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actions = [],
}: {
  icon: LucideIcon
  title: string
  description: string
  actions?: EmptyStateAction[]
}) {
  return (
    <Card className="border-dashed bg-slate-50/50">
      <CardContent className="p-8 text-center">
        <Icon className="w-10 h-10 mx-auto mb-3 text-slate-400" aria-hidden="true" />
        <h3 className="text-lg font-semibold mb-1">{title}</h3>
        <p className="text-sm text-slate-500 mb-4 max-w-md mx-auto">{description}</p>
        {actions.length > 0 && (
          <div className="flex gap-2 justify-center flex-wrap">
            {actions.map((a, i) => (
              <Button key={a.href} asChild size="sm" variant={a.variant ?? (i === 0 ? 'default' : 'outline')}>
                <Link href={a.href}>{a.label}</Link>
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
