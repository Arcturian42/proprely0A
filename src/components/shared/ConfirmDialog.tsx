'use client'

import { useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  // Accept any return — callers often pass arrow functions that conditionally
  // do nothing (`x && doStuff()`), which would typecheck-fail under stricter
  // `() => void`. We `await` whatever they return regardless.
  onConfirm: () => unknown
  variant?: 'destructive' | 'default'
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  onConfirm,
  variant = 'default',
}: ConfirmDialogProps) {
  const [pending, setPending] = useState(false)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  // For destructive actions we default focus to Cancel so accidental Enter
  // doesn't trigger the destructive path — matches the macOS/iOS pattern.
  // For default actions, Confirm is the expected primary action.
  const initialFocusRef = variant === 'destructive' ? cancelRef : confirmRef

  async function handleConfirm() {
    if (pending) return
    setPending(true)
    try {
      await Promise.resolve(onConfirm())
      onOpenChange(false)
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        // Don't let the user dismiss the dialog while we're awaiting onConfirm —
        // otherwise the same action could be triggered twice from different paths.
        if (pending) return
        onOpenChange(next)
      }}
    >
      <DialogContent
        onOpenAutoFocus={e => {
          // Override Radix's default first-focusable behaviour so destructive
          // dialogs land on Cancel rather than the danger button.
          e.preventDefault()
          initialFocusRef.current?.focus()
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            ref={cancelRef}
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? 'Veuillez patienter…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
