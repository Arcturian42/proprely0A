import { timingSafeEqual } from 'crypto'

/**
 * Constant-time check of an `Authorization: Bearer <secret>` header.
 *
 * `===` would leak the secret length via early exit; `timingSafeEqual`
 * requires equal-length buffers and runs in constant time. Length check
 * up-front so the helper short-circuits cleanly when the header is empty
 * or malformed.
 */
export function verifyBearer(header: string | null, secret: string | undefined): boolean {
  if (!secret) return false
  if (!header) return false
  const expected = `Bearer ${secret}`
  const a = Buffer.from(header)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
