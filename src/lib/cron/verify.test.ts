import { describe, it, expect, beforeEach } from 'vitest'
import { verifyCronRequest } from './verify'

function reqWithAuth(auth: string | null): Request {
  const headers = new Headers()
  if (auth !== null) headers.set('authorization', auth)
  return new Request('https://example.com/api/cron/x', { headers })
}

describe('verifyCronRequest', () => {
  beforeEach(() => {
    delete process.env.CRON_SECRET
  })

  it('returns 500 when CRON_SECRET is unconfigured', async () => {
    const res = verifyCronRequest(reqWithAuth('Bearer anything'))
    expect(res).not.toBeNull()
    expect(res!.status).toBe(500)
    const body = await res!.json()
    expect(body.error).toMatch(/not configured/i)
  })

  it('returns 401 when the header is missing', async () => {
    process.env.CRON_SECRET = 'test-secret-123'
    const res = verifyCronRequest(reqWithAuth(null))
    expect(res).not.toBeNull()
    expect(res!.status).toBe(401)
  })

  it('returns 401 when the bearer value does not match', async () => {
    process.env.CRON_SECRET = 'test-secret-123'
    const res = verifyCronRequest(reqWithAuth('Bearer wrong'))
    expect(res).not.toBeNull()
    expect(res!.status).toBe(401)
  })

  it('returns 401 when the prefix is missing', async () => {
    process.env.CRON_SECRET = 'test-secret-123'
    const res = verifyCronRequest(reqWithAuth('test-secret-123'))
    expect(res).not.toBeNull()
    expect(res!.status).toBe(401)
  })

  it('returns null (authorized) when the bearer matches exactly', () => {
    process.env.CRON_SECRET = 'test-secret-123'
    const res = verifyCronRequest(reqWithAuth('Bearer test-secret-123'))
    expect(res).toBeNull()
  })
})
