import { describe, expect, it } from 'vitest'
import type { AnalyzedDocument } from '../domain/document'
import { sequencePatchFromManualEdit, shouldInvalidateRenameState } from './review-edit'

function doc(overrides: Partial<AnalyzedDocument> = {}): AnalyzedDocument {
  return {
    id: 'doc-1',
    originalName: '001072_003604_DT.jpg',
    kind: 'DECLARACAO_TRANSITO',
    prontuario: '001072',
    numeroDocumento: '003604',
    documentDate: '05/10/2024',
    caseMode: null,
    isMonthly: false,
    suggestedName: '001072_003604_DT.jpg',
    confidence: 0.8,
    numeroDocumentoConfidence: 0.42,
    numeroDocumentoOcrSource: 'TESSERACT',
    reviewStatus: 'REVISAR',
    validations: [],
    ...overrides,
  }
}

describe('sequencePatchFromManualEdit', () => {
  it('não eleva confiança ao apenas focar e sair do campo', () => {
    expect(sequencePatchFromManualEdit(doc(), '003604')).toBeNull()
  })

  it('marca como manual somente quando a sequência realmente muda', () => {
    expect(sequencePatchFromManualEdit(doc(), '003605')).toEqual({
      numeroDocumento: '003605',
      numeroDocumentoConfidence: 1,
      numeroDocumentoOcrSource: 'MANUAL',
    })
  })

  it('permite limpar manualmente a sequência', () => {
    expect(sequencePatchFromManualEdit(doc(), '')).toEqual({
      numeroDocumento: null,
      numeroDocumentoConfidence: null,
      numeroDocumentoOcrSource: null,
    })
  })
})

describe('shouldInvalidateRenameState', () => {
  it('invalida RENOMEADO quando campo que forma o nome muda', () => {
    expect(shouldInvalidateRenameState(
      doc({ renameState: 'RENOMEADO' }),
      { numeroDocumento: '003605' },
      '001072_003605_DT.jpg',
    )).toBe(true)
  })

  it('não invalida renomeação ao alterar somente a data', () => {
    expect(shouldInvalidateRenameState(
      doc({ renameState: 'RENOMEADO' }),
      { documentDate: '06/10/2024' },
      '001072_003604_DT.jpg',
    )).toBe(false)
  })

  it('não invalida quando o nome proposto não mudou', () => {
    expect(shouldInvalidateRenameState(
      doc({ renameState: 'RENOMEADO' }),
      { prontuario: '001072' },
      '001072_003604_DT.jpg',
    )).toBe(false)
  })
})
