import { describe, expect, it } from 'vitest'
import type { AnalyzedDocument } from '../domain/document'
import { analyzeBatch, summarizeBatch } from './batch-processing'

function doc(overrides: Partial<AnalyzedDocument> = {}): AnalyzedDocument {
  return {
    id: crypto.randomUUID(),
    originalName: 'scan.jpg',
    kind: null,
    prontuario: null,
    numeroDocumento: null,
    documentDate: null,
    caseMode: null,
    isMonthly: false,
    suggestedName: null,
    confidence: null,
    reviewStatus: 'PENDENTE',
    validations: [],
    ...overrides,
  }
}

describe('analyzeBatch', () => {
  it('manda documento sem classificação para revisão', () => {
    const [result] = analyzeBatch([doc()])
    expect(result.reviewStatus).toBe('REVISAR')
    expect(result.suggestedName).toBeNull()
  })

  it('aprova automaticamente somente tipo com cobertura liberada', () => {
    const [result] = analyzeBatch([
      doc({
        kind: 'DECLARACAO_TRANSITO',
        prontuario: '1990',
        numeroDocumento: '013068',
        documentDate: '02/09/2026',
      }),
    ])

    expect(result.reviewStatus).toBe('OK')
    expect(result.suggestedName).toBe('001990_013068_dt.jpg')
  })

  it('mantém C1 completa para revisão enquanto faltam regras automáticas', () => {
    const [result] = analyzeBatch([
      doc({
        kind: 'FICHA_C1',
        prontuario: '2103',
        documentDate: '23/09/2026',
        caseMode: 'REUNIAO',
      }),
    ])

    expect(result.reviewStatus).toBe('REVISAR')
    expect(result.validations.some((item) => item.id === 'automation-rule-coverage')).toBe(true)
  })

  it('mantém não conformidade já confirmada', () => {
    const [result] = analyzeBatch([
      doc({
        kind: 'FICHA_C1',
        prontuario: '002103',
        documentDate: '23/09/2026',
        caseMode: 'REUNIAO',
        reviewStatus: 'NAO_CONFORME',
      }),
    ])
    expect(result.reviewStatus).toBe('NAO_CONFORME')
  })

  it('resume automáticos, revisões e não conformes', () => {
    const analyzed = analyzeBatch([
      doc({ kind: 'DECLARACAO_TRANSITO', prontuario: '1990', numeroDocumento: '013068', documentDate: '02/09/2026' }),
      doc(),
      doc({ reviewStatus: 'NAO_CONFORME' }),
    ])
    expect(summarizeBatch(analyzed)).toEqual({
      total: 3,
      automaticos: 1,
      revisar: 1,
      naoConformes: 1,
    })
  })
})
