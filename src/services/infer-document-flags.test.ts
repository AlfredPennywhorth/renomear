import { describe, expect, it } from 'vitest'
import { inferEnvelopeFlags } from './infer-document-flags'

describe('inferEnvelopeFlags', () => {
  it('identifica atendimento mensal quando a palavra mensal está explícita', () => {
    const result = inferEnvelopeFlags('C = Mensal R$ 1.500,00')
    expect(result.isMonthly).toBe(true)
    expect(result.monthlyConfidence).toBe('HIGH')
    expect(result.evidence).toBe('MENSAL')
  })

  it('não infere mensal apenas pela existência de valor', () => {
    const result = inferEnvelopeFlags('C = Valor R$ 1.500,00')
    expect(result.isMonthly).toBe(false)
  })
})
