import { describe, expect, it } from 'vitest'
import type { AnalyzedDocument } from '../domain/document'
import { decideProntuario } from './prontuario-decision'

function doc(overrides: Partial<AnalyzedDocument> = {}): AnalyzedDocument {
  return {
    id: 'doc-1',
    originalName: '0136.jpg',
    kind: 'ENVELOPE',
    prontuario: null,
    numeroDocumento: '041972',
    documentDate: '05/10/2024',
    caseMode: null,
    isMonthly: true,
    suggestedName: null,
    confidence: 0.6,
    reviewStatus: 'REVISAR',
    validations: [],
    ...overrides,
  }
}

describe('decideProntuario', () => {
  it('aceita consenso entre leitura global e recorte impresso', () => {
    expect(decideProntuario(
      doc(),
      '000136',
      0,
      null,
      0,
      '000136',
    )).toEqual({
      value: '000136',
      confidence: 0.9,
      source: 'CONSENSUS',
      conflict: false,
      lowConfidence: false,
    })
  })

  it('não aceita leitura isolada de baixa confiança', () => {
    expect(decideProntuario(
      doc(),
      '000136',
      0,
      null,
      0,
      null,
    ).value).toBeNull()
  })

  it('prioriza divergência do Paddle sobre consenso global e recorte', () => {
    const result = decideProntuario(
      doc(),
      '000136',
      0.91,
      '000186',
      0.94,
      '000136',
    )

    expect(result.value).toBeNull()
    expect(result.conflict).toBe(true)
  })

  it('continua recusando leitores divergentes', () => {
    const result = decideProntuario(
      doc(),
      '000136',
      0.9,
      '000186',
      0.93,
      null,
    )

    expect(result.value).toBeNull()
    expect(result.conflict).toBe(true)
  })
})
