export function normalizeProntuario(value: string): string | null {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 0 || digits.length > 6) return null
  const normalized = digits.padStart(6, '0')
  if (normalized === '000000') return null
  return normalized
}
