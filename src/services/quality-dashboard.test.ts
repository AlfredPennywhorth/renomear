import { describe, expect, it } from 'vitest'
import type { AnalyzedDocument } from '../domain/document'
import { calculateQualityMetrics } from './quality-dashboard'

function doc(id: string, status: AnalyzedDocument['reviewStatus']): AnalyzedDocument {
  return {
    id,
    originalName: id + '.jpg',
    kind: 'FICHA_C1',
    prontuario: '001234',
    numeroDocumento: null,
    documentDate: '01/01/2026',
    caseMode: 'REUNIAO',
    isMonthly: false,
    suggestedName: null,
    confidence: null,
    reviewStatus: status,
    validations: [],
  }
}

describe('calculateQualityMetrics', () => {
  it('calcula cobertura e conformidade apenas sobre avaliados', () => {
    const metrics = calculateQualityMetrics(
      [doc('1', 'OK'), doc('2', 'REVISAR'), doc('3', 'PENDENTE')],
      [],
    )
    expect(metrics.reviewCoverage).toBe(67)
    expect(metrics.conformityRate).toBe(50)
    expect(metrics.pending).toBe(1)
  })

  it('agrupa inconsistências por motivo', () => {
    const metrics = calculateQualityMetrics(
      [doc('1', 'REVISAR')],
      [
        {
          prontuario: '001234',
          arquivo: '1.jpg',
          tipo: 'Ficha C1 - frente',
          gravidade: 'REVISAR',
          inconsistencia: 'Assinatura',
          valorIdentificado: '',
          observacao: '',
        },
        {
          prontuario: '001235',
          arquivo: '2.jpg',
          tipo: 'Envelope/recibo',
          gravidade: 'REVISAR',
          inconsistencia: 'Assinatura',
          valorIdentificado: '',
          observacao: '',
        },
      ],
    )
    expect(metrics.topIssues[0]).toEqual({ label: 'Assinatura', count: 2 })
  })
})
