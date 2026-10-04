export type InferredFlags = {
  isMonthly: boolean
  monthlyConfidence: 'HIGH' | 'LOW'
  evidence: string | null
}

export function inferEnvelopeFlags(text: string): InferredFlags {
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()

  const explicitMonthly = /\bMENSAL\b/.test(normalized)

  return {
    isMonthly: explicitMonthly,
    monthlyConfidence: explicitMonthly ? 'HIGH' : 'LOW',
    evidence: explicitMonthly ? 'MENSAL' : null,
  }
}
