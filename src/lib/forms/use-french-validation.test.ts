import { describe, it, expect } from 'vitest'
import { _messageFor } from './use-french-validation'

// Builds a stub element whose `validity` and `name`/`type`/`minLength`/`maxLength`
// match the bits _messageFor reads. Avoids JSDOM gymnastics for what is a pure
// function over the ValidityState shape.
function stub(opts: {
  name?: string
  type?: string
  minLength?: number
  maxLength?: number
  validity: Partial<ValidityState>
}): HTMLInputElement {
  const v: ValidityState = {
    valueMissing: false,
    typeMismatch: false,
    tooShort: false,
    tooLong: false,
    patternMismatch: false,
    rangeUnderflow: false,
    rangeOverflow: false,
    stepMismatch: false,
    badInput: false,
    customError: false,
    valid: false,
    ...opts.validity,
  } as ValidityState
  return {
    name: opts.name ?? '',
    type: opts.type ?? 'text',
    minLength: opts.minLength ?? -1,
    maxLength: opts.maxLength ?? -1,
    validity: v,
  } as unknown as HTMLInputElement
}

describe('useFrenchValidation _messageFor', () => {
  it('returns a French valueMissing message with the field label when available', () => {
    expect(_messageFor(stub({ name: 'email', validity: { valueMissing: true } })))
      .toBe('Adresse email est requis.')
    expect(_messageFor(stub({ name: 'owner_first_name', validity: { valueMissing: true } })))
      .toBe('Prénom est requis.')
    expect(_messageFor(stub({ name: 'company_name', validity: { valueMissing: true } })))
      .toBe("Nom de l'entreprise est requis.")
  })

  it('falls back to "Ce champ" for unknown field names', () => {
    expect(_messageFor(stub({ name: 'random_thing', validity: { valueMissing: true } })))
      .toBe('Ce champ est requis.')
  })

  it('returns the email-specific message when type=email and typeMismatch', () => {
    expect(_messageFor(stub({ name: 'email', type: 'email', validity: { typeMismatch: true } })))
      .toMatch(/Adresse email invalide/)
  })

  it('returns a tooShort message including the minLength', () => {
    expect(_messageFor(stub({ name: 'company_name', minLength: 2, validity: { tooShort: true } })))
      .toBe("Nom de l'entreprise doit contenir au moins 2 caractères.")
    expect(_messageFor(stub({ name: 'company_name', minLength: 1, validity: { tooShort: true } })))
      .toBe("Nom de l'entreprise doit contenir au moins 1 caractère.")
  })

  it('returns a tooLong message including the maxLength', () => {
    expect(_messageFor(stub({ name: 'company_name', maxLength: 200, validity: { tooLong: true } })))
      .toBe("Nom de l'entreprise ne peut pas dépasser 200 caractères.")
  })

  it('never returns an English fragment', () => {
    const cases: Array<Partial<ValidityState>> = [
      { valueMissing: true },
      { typeMismatch: true },
      { tooShort: true },
      { tooLong: true },
      { patternMismatch: true },
      { rangeUnderflow: true },
      { badInput: true },
    ]
    for (const v of cases) {
      const msg = _messageFor(stub({ name: 'email', type: 'email', minLength: 2, maxLength: 10, validity: v }))
      expect(msg).not.toMatch(/please|fill out|include|invalid value|must contain/i)
    }
  })
})
