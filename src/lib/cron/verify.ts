import { timingSafeEqual } from 'crypto'

/**
 * P3.4 / BUG-MIN-07 — Verify a CRON request bearer secret with a constant-
 * time comparison so a remote attacker can't infer the secret length via a
 * timing side-channel. Returns a Response on rejection (caller forwards it)
 * or null on success.
 *
 * Why not signed payloads? Vercel Cron jobs are stateless GETs from
 * Vercel's own runtime — there's nothing to sign. The shared secret is the
 * right tool here ; the goal is just to make the comparison itself safe and
 * to fail closed if the secret is missing in production.
 */
export function verifyCronRequest(req: Request): Response | null {
  const secret = process.env.CRON_SECRET
  const provided = req.headers.get('authorization') ?? ''

  // Fail closed in production if the secret isn't configured. In other
  // environments (preview/dev) we still want CRON_SECRET set, but a misconfig
  // there shouldn't leak data — return 401 as well.
  if (!secret) {
    return Response.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  const expected = `Bearer ${secret}`
  const expectedBuf = Buffer.from(expected)
  const providedBuf = Buffer.from(provided)

  // Length mismatch fails immediately — timingSafeEqual requires equal-length
  // buffers and would throw. We still pad the comparison to keep the timing
  // observable to the attacker uniform (one fixed-cost compare per request).
  if (providedBuf.length !== expectedBuf.length) {
    // Avoid the throw + run a dummy compare against expected to keep timing
    // close to the success path.
    const padded = Buffer.alloc(expectedBuf.length, 0)
    timingSafeEqual(padded, expectedBuf)
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  if (!timingSafeEqual(providedBuf, expectedBuf)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  return null
}
