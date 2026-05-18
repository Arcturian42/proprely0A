// SIRET validation — Luhn algorithm on the 14-digit identifier.
// SIRET = SIREN (9 digits) + NIC (5 digits). The Luhn checksum applies to
// the whole 14-digit string, with one special case: La Poste's SIRET
// 356 000 000 + NIC bypasses Luhn (sum of digits must be divisible by 5).
//
// References:
// - https://fr.wikipedia.org/wiki/Système_d%27identification_du_répertoire_des_établissements
// - https://www.insee.fr/fr/information/2406147

export function isValidSiret(value: string): boolean {
  const digits = value.replace(/\s/g, '')
  if (!/^\d{14}$/.test(digits)) return false

  // Special case: La Poste — sum of digits mod 5
  if (digits.startsWith('356000000')) {
    const sum = digits.split('').reduce((acc, d) => acc + Number(d), 0)
    return sum % 5 === 0
  }

  // Standard Luhn: double every second digit from the right (i.e. even index
  // when read right-to-left = odd index when read left-to-right for 14 digits).
  let sum = 0
  for (let i = 0; i < 14; i++) {
    let d = Number(digits[i])
    // Position 0,2,4,6,8,10,12 (from left) get doubled — they correspond to
    // odd positions when counted from the right for a 14-char string.
    if (i % 2 === 0) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
  }
  return sum % 10 === 0
}

export function isValidSiren(value: string): boolean {
  const digits = value.replace(/\s/g, '')
  if (!/^\d{9}$/.test(digits)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) {
    let d = Number(digits[i])
    // Luhn doubles odd-indexed digits when read left-to-right for 9 chars.
    if (i % 2 === 1) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
  }
  return sum % 10 === 0
}
