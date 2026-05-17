import { describe, expect, it } from 'vitest'
import { sanitizeHtml, stripHtml } from './sanitize'

describe('sanitizeHtml', () => {
  it('returns empty string for nullish input', () => {
    expect(sanitizeHtml(null)).toBe('')
    expect(sanitizeHtml(undefined)).toBe('')
    expect(sanitizeHtml('')).toBe('')
  })

  it('strips <script> blocks regardless of casing or attributes', () => {
    expect(sanitizeHtml('<script>alert(1)</script>hello')).toBe('hello')
    expect(sanitizeHtml('<SCRIPT src="x">x</SCRIPT>safe')).toBe('safe')
  })

  it('removes inline event handlers', () => {
    const out = sanitizeHtml('<button onclick="alert(1)">go</button>')
    expect(out).not.toMatch(/onclick/i)
    expect(out).toContain('<button')
  })

  it('neutralises javascript: URLs', () => {
    const out = sanitizeHtml('<a href= javascript:alert(1)>x</a>')
    expect(out).not.toMatch(/javascript:/i)
  })

  it('leaves plain markup alone', () => {
    expect(sanitizeHtml('<b>ok</b>')).toBe('<b>ok</b>')
  })
})

describe('stripHtml', () => {
  it('removes all tags', () => {
    expect(stripHtml('<p>hello <b>world</b></p>')).toBe('hello world')
  })

  it('returns empty for nullish', () => {
    expect(stripHtml(null)).toBe('')
    expect(stripHtml(undefined)).toBe('')
  })
})
