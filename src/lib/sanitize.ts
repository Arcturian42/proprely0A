// Single chokepoint for any HTML we ever need to render from user input.
// React already escapes string children, so use this ONLY when wrapping
// dangerouslySetInnerHTML — and prefer not to.
export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return ''
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\sjavascript:/gi, '')
}

export function stripHtml(input: string | null | undefined): string {
  if (!input) return ''
  return input.replace(/<[^>]*>/g, '')
}
