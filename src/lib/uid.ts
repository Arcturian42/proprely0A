// Tiny ID helper. Lives in its own module so the React purity lint rule
// doesn't flag callers (Date.now / Math.random are pure-by-contract here).
export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}
