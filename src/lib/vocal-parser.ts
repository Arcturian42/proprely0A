import { ParsedQuoteData } from '@/types/pipeline'

const SURFACE_PATTERNS: { regex: RegExp; type: string }[] = [
  { regex: /(\d+(?:[,. ]\d+)?)\s*m(?:ètres?|2|²)?\s*(?:de\s+)?moquette/i, type: 'moquette' },
  { regex: /moquette\s*(?:de\s+)?(\d+(?:[,. ]\d+)?)\s*m(?:ètres?|2|²)?/i, type: 'moquette' },
  { regex: /(\d+(?:[,. ]\d+)?)\s*m(?:ètres?|2|²)?\s*(?:de\s+)?(?:sol|carrelage|parquet)/i, type: 'sol' },
  { regex: /(\d+(?:[,. ]\d+)?)\s*m(?:ètres?|2|²)?\s*(?:de\s+)?vitres?/i, type: 'vitres' },
  { regex: /(\d+(?:[,. ]\d+)?)\s*m(?:ètres?|2|²)?\s*(?:de\s+)?bureaux?/i, type: 'bureaux' },
  { regex: /(\d+(?:[,. ]\d+)?)\s*m(?:ètres?|2|²)/i, type: 'surface totale' },
]

const FREQUENCY_PATTERNS: { regex: RegExp; value: string }[] = [
  { regex: /(\d+)\s*fois\s*par\s*semaine/i, value: 'x/semaine' },
  { regex: /(\d+)\s*fois\s*par\s*mois/i, value: 'x/mois' },
  { regex: /tous?\s*les?\s*jours?/i, value: 'quotidien' },
  { regex: /quotidien/i, value: 'quotidien' },
  { regex: /hebdomadaire/i, value: '1x/semaine' },
  { regex: /mensuel/i, value: '1x/mois' },
]

const SERVICE_KEYWORDS: { keywords: string[]; type: string }[] = [
  { keywords: ['bureau', 'bureaux', 'open space', 'openspace'], type: 'Nettoyage bureaux' },
  { keywords: ['industriel', 'usine', 'atelier', 'entrepôt', 'entrepot'], type: 'Nettoyage industriel' },
  { keywords: ['médical', 'medical', 'cabinet', 'clinique', 'hôpital', 'hopital'], type: 'Nettoyage médical' },
  { keywords: ['vitre', 'vitres', 'vitrage', 'fenêtre', 'fenetre'], type: 'Vitrerie' },
  { keywords: ['moquette'], type: 'Nettoyage moquette' },
  { keywords: ['commun', 'couloir', 'parking', 'cage escalier'], type: 'Parties communes' },
]

const DAY_KEYWORDS: { keyword: string; day: string }[] = [
  { keyword: 'lundi', day: 'Lundi' },
  { keyword: 'mardi', day: 'Mardi' },
  { keyword: 'mercredi', day: 'Mercredi' },
  { keyword: 'jeudi', day: 'Jeudi' },
  { keyword: 'vendredi', day: 'Vendredi' },
  { keyword: 'samedi', day: 'Samedi' },
  { keyword: 'dimanche', day: 'Dimanche' },
]

const TIME_KEYWORDS: { keyword: string; label: string }[] = [
  { keyword: 'matin', label: 'matin' },
  { keyword: 'soir', label: 'soir' },
  { keyword: 'nuit', label: 'nuit' },
  { keyword: 'journée', label: 'journée' },
  { keyword: 'journee', label: 'journée' },
]

function parseNumber(str: string): number {
  return parseFloat(str.replace(/[, ]+/, '.'))
}

export function parseVocalInput(text: string): ParsedQuoteData {
  const lower = text.toLowerCase()
  const surfaces: ParsedQuoteData['surfaces'] = []
  const constraints: string[] = []

  // Parse surfaces
  for (const pattern of SURFACE_PATTERNS) {
    const match = text.match(pattern.regex)
    if (match) {
      const area = parseNumber(match[1])
      if (!isNaN(area) && area > 0) {
        if (!surfaces.find(s => s.type === pattern.type)) {
          surfaces.push({ type: pattern.type, area, unit: 'm²' })
        }
      }
    }
  }

  // Parse frequency
  let frequency: string | undefined
  for (const fp of FREQUENCY_PATTERNS) {
    const match = text.match(fp.regex)
    if (match) {
      if (fp.value.includes('x')) {
        const count = match[1] ? match[1] : '1'
        frequency = `${count}${fp.value}`
      } else {
        frequency = fp.value
      }
      break
    }
  }

  // Parse service type
  let service_type: string | undefined
  for (const sk of SERVICE_KEYWORDS) {
    if (sk.keywords.some(kw => lower.includes(kw))) {
      service_type = sk.type
      break
    }
  }
  if (!service_type && surfaces.length > 0) {
    service_type = 'Nettoyage bureaux'
  }

  // Parse day constraints
  const days: string[] = []
  for (const dk of DAY_KEYWORDS) {
    if (lower.includes(dk.keyword)) {
      days.push(dk.day)
    }
  }

  // Parse time of day constraints
  for (const tk of TIME_KEYWORDS) {
    if (lower.includes(tk.keyword)) {
      if (days.length > 0) {
        constraints.push(`${days.join('/')} ${tk.label}`)
      } else {
        constraints.push(`Intervention le ${tk.label}`)
      }
      break
    }
  }

  if (days.length > 0 && constraints.length === 0) {
    constraints.push(`Jours : ${days.join(', ')}`)
  }

  return {
    surfaces,
    service_type,
    frequency,
    constraints,
    raw_text: text,
  }
}

export function formatParsedData(data: ParsedQuoteData): string[] {
  const lines: string[] = []
  for (const s of data.surfaces) {
    lines.push(`Surface ${s.type} : ${s.area} ${s.unit}`)
  }
  if (data.service_type) lines.push(`Service : ${data.service_type}`)
  if (data.frequency) lines.push(`Fréquence : ${data.frequency}`)
  for (const c of data.constraints ?? []) {
    lines.push(`Contraintes : ${c}`)
  }
  return lines
}
