'use client'

import { useCallback } from 'react'

/**
 * HTML5 constraint-validation messages default to the browser's UI language
 * ("Please fill out this field"), not <html lang>. To deliver consistent
 * French copy on /login & /signup we replace them via setCustomValidity()
 * inside an onInvalid handler.
 *
 * Usage on a form:
 *   <form onSubmit={...}>
 *     <input onInvalid={onInvalid} onInput={onInput} required ... />
 *   </form>
 *
 * Do NOT add `noValidate` — that disables native validation entirely, and
 * `onInvalid` never fires. We *want* the browser to validate; we just
 * substitute its English copy with our French via setCustomValidity().
 * `onInput` clears the custom message as the user types so the next submit
 * re-runs validation cleanly.
 */
export interface FrenchValidationHandlers {
  onInvalid: (e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
  onInput: (e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
}

const FIELD_LABELS: Record<string, string> = {
  email: 'Adresse email',
  owner_first_name: 'Prénom',
  owner_last_name: 'Nom',
  company_name: "Nom de l'entreprise",
  password: 'Mot de passe',
  confirm_password: 'Confirmation du mot de passe',
}

function labelFor(target: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
  return FIELD_LABELS[target.name] ?? 'Ce champ'
}

function messageFor(target: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
  const v = target.validity
  const label = labelFor(target)
  if (v.valueMissing) return `${label} est requis.`
  if (v.typeMismatch && (target as HTMLInputElement).type === 'email') {
    return "Adresse email invalide (ex. prenom@entreprise.fr)."
  }
  if (v.typeMismatch && (target as HTMLInputElement).type === 'url') {
    return "Adresse URL invalide."
  }
  if (v.tooShort) {
    const min = (target as HTMLInputElement).minLength
    return `${label} doit contenir au moins ${min} caractère${min > 1 ? 's' : ''}.`
  }
  if (v.tooLong) {
    const max = (target as HTMLInputElement).maxLength
    return `${label} ne peut pas dépasser ${max} caractères.`
  }
  if (v.patternMismatch) return `${label} ne respecte pas le format attendu.`
  if (v.rangeUnderflow || v.rangeOverflow || v.stepMismatch) {
    return `${label} contient une valeur hors limites.`
  }
  if (v.badInput) return `${label} contient une valeur non valide.`
  return `${label} est invalide.`
}

export function useFrenchValidation(): FrenchValidationHandlers {
  const onInvalid = useCallback<FrenchValidationHandlers['onInvalid']>((e) => {
    const target = e.currentTarget
    target.setCustomValidity(messageFor(target))
  }, [])

  const onInput = useCallback<FrenchValidationHandlers['onInput']>((e) => {
    // Reset the custom message as soon as the user types — otherwise the old
    // error sticks even after the value becomes valid.
    e.currentTarget.setCustomValidity('')
  }, [])

  return { onInvalid, onInput }
}

// Exported for unit tests (pure function, no React state).
export const _messageFor = messageFor
