import { describe, it, expect } from 'vitest'
import { toUserMessage } from './user-message'

describe('toUserMessage', () => {
  it('hides "schema cache" / missing-table errors behind a generic FR message', () => {
    expect(
      toUserMessage(new Error("Could not find the table 'public.onboarding_status' in the schema cache")),
    ).toMatch(/temporairement indisponible/i)
    expect(
      toUserMessage(new Error('relation "profiles" does not exist')),
    ).toMatch(/temporairement indisponible/i)
  })

  it('maps unique constraint violations to a friendly FR message', () => {
    expect(
      toUserMessage(new Error('duplicate key value violates unique constraint "profiles_pkey"')),
    ).toMatch(/existe déjà/i)
  })

  it('maps FK violations', () => {
    expect(
      toUserMessage(new Error('insert or update on table "clients" violates foreign key constraint')),
    ).toMatch(/référence invalide/i)
  })

  it('maps NOT NULL / CHECK violations', () => {
    expect(
      toUserMessage(new Error('null value in column "email" violates not-null constraint')),
    ).toMatch(/champ obligatoire/i)
    expect(
      toUserMessage(new Error('new row for relation "missions" violates check constraint "missions_status_check"')),
    ).toMatch(/données invalides/i)
  })

  it('maps RLS / permission errors', () => {
    expect(
      toUserMessage(new Error('new row violates row-level security policy for table "sites"')),
    ).toMatch(/droits nécessaires/i)
  })

  it('maps JWT / network errors', () => {
    expect(toUserMessage(new Error('JWT expired'))).toMatch(/session expirée/i)
    expect(toUserMessage(new Error('fetch failed'))).toMatch(/réseau/i)
  })

  it('passes through short French messages', () => {
    expect(toUserMessage(new Error('Email invalide'))).toBe('Email invalide')
  })

  it('uses the fallback for stack-traces and very long technical dumps', () => {
    const stack = 'TypeError: Cannot read properties of undefined\n    at Object.<anonymous> (/var/task/.next/server/chunks/12.js:1:1)\n    at Module._compile (node:internal/modules/cjs/loader:1108:14)\n    at Object.Module._extensions..js (node:internal/modules/cjs/loader:1138:10)'
    expect(toUserMessage(new Error(stack), 'Sauvegarde échouée')).toBe('Sauvegarde échouée')
  })

  it('handles non-Error inputs', () => {
    expect(toUserMessage('JWT expired')).toMatch(/session expirée/i)
    expect(toUserMessage(undefined, 'Erreur par défaut')).toBe('Erreur par défaut')
  })
})
