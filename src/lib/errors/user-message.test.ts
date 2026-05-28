import { describe, it, expect } from 'vitest'
import { isSchemaCacheError, toUserMessage } from './user-message'

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

  it('maps Supabase Auth built-in rate-limit messages to French', () => {
    expect(
      toUserMessage(new Error('For security purposes, you can only request this after 34 seconds.')),
    ).toMatch(/trop de tentatives/i)
    expect(toUserMessage({ message: 'over_email_send_rate_limit', code: '429' })).toMatch(/trop de tentatives/i)
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

  it('extracts .message from supabase PostgrestError-shaped plain objects', () => {
    // supabase-js returns plain objects (not Error instances) with a .message
    // field. Before this extraction logic, instanceof Error returned false and
    // every Supabase error fell through to the fallback — the bug that hid the
    // real schema-cache message in BUG-001.
    const supabaseError = {
      message: "Could not find the table 'public.profiles' in the schema cache",
      code: 'PGRST106',
      details: null,
      hint: null,
    }
    expect(toUserMessage(supabaseError, 'fallback')).toMatch(/temporairement indisponible/i)
  })

  it('extracts .message from AuthError-shaped objects', () => {
    const authError = { message: 'User already registered', status: 422 }
    expect(toUserMessage(authError)).toBe('User already registered')
  })

  it('falls back when an object has no string message', () => {
    expect(toUserMessage({ code: 'X', details: 'Y' }, 'fb')).toBe('fb')
    expect(toUserMessage({ message: 42 }, 'fb')).toBe('fb')
    expect(toUserMessage({}, 'fb')).toBe('fb')
  })
})

describe('isSchemaCacheError', () => {
  it('returns true for PostgREST schema-cache misses', () => {
    expect(
      isSchemaCacheError(new Error("Could not find the table 'public.onboarding_status' in the schema cache")),
    ).toBe(true)
    expect(isSchemaCacheError(new Error('relation "profiles" does not exist'))).toBe(true)
    expect(
      isSchemaCacheError(new Error('column "lost_reason" of relation "opportunities" does not exist')),
    ).toBe(true)
  })

  it('returns false for non-schema errors', () => {
    expect(isSchemaCacheError(new Error('JWT expired'))).toBe(false)
    expect(isSchemaCacheError(new Error('fetch failed'))).toBe(false)
    expect(isSchemaCacheError(new Error('duplicate key value violates unique constraint'))).toBe(false)
  })

  it('detects PGRST205 by error code alone (no message needed)', () => {
    expect(isSchemaCacheError({ code: 'PGRST205', details: null, hint: null, message: '' })).toBe(true)
    expect(isSchemaCacheError({ code: 'PGRST205' })).toBe(true)
  })

  it('returns false for empty / unknown inputs', () => {
    expect(isSchemaCacheError(null)).toBe(false)
    expect(isSchemaCacheError(undefined)).toBe(false)
    expect(isSchemaCacheError('')).toBe(false)
    expect(isSchemaCacheError({})).toBe(false)
    expect(isSchemaCacheError({ code: 'PGRST106' })).toBe(false)
  })

  it('matches Supabase PostgrestError-shaped plain objects', () => {
    expect(
      isSchemaCacheError({
        message: "Could not find the table 'public.profiles' in the schema cache",
        code: 'PGRST106',
      }),
    ).toBe(true)
  })
})
