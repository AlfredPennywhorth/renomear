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

  it('aprova automaticamente C1 completa sem alertas', () => {
    const [result] = analyzeBatch([
      doc({
        kind: 'FICHA_C1',
        prontuario: '2103',
        documentDate: '23/09/2026',
        caseMode: 'REUNIAO',
      }),
    ])

    expect(result.reviewStatus).toBe('OK')
    expect(result.suggestedName).toBe('002103_c1_frente.jpg')
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
      doc({ kind: 'FICHA_C1', prontuario: '2103', documentDate: '23/09/2026', caseMode: 'REUNIAO' }),
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
