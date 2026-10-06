import { describe, expect, it } from 'vitest'
import type { AnalyzedDocument } from '../domain/document'
import { sequencePatchFromManualEdit, shouldInvalidateRenameState, rotateDocumentManually } from './review-edit'

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


describe('giro manual', () => {
  it('gira nos dois sentidos e completa uma volta sem alterar a identidade', () => {
    const original = doc({ rotationDegrees: 0 })
    expect(rotateDocumentManually(original, 'LEFT').rotationDegrees).toBe(270)
    let rotated = original
    for (let i = 0; i < 4; i++) rotated = rotateDocumentManually(rotated, 'RIGHT')
    expect(rotated.rotationDegrees).toBe(0)
    expect(rotated.prontuario).toBe(original.prontuario)
    expect(rotated.prontuarioConfidence).toBe(original.prontuarioConfidence)
  })

  it('invalida aprovação e renomeação anterior, resolve só o alerta de orientação', () => {
    const rotated = rotateDocumentManually(doc({
      renameState: 'RENOMEADO', manualReviewApproved: true,
      validations: [
        { id: 'ocr-orientation-uncertain', label: '', value: null, status: 'REVISAR' },
        { id: 'ocr-prontuario-conflict', label: '', value: null, status: 'REVISAR' },
      ],
    }), 'RIGHT')
    expect(rotated.renameState).toBe('NAO_RENOMEADO')
    expect(rotated.manualReviewApproved).toBe(false)
    expect(rotated.validations.some(v => v.id === 'ocr-orientation-uncertain')).toBe(false)
    expect(rotated.validations.some(v => v.id === 'ocr-prontuario-conflict')).toBe(true)
  })

  it('preserva não conformidade', () => {
    expect(rotateDocumentManually(doc({ reviewStatus: 'NAO_CONFORME' }), 'RIGHT').reviewStatus).toBe('NAO_CONFORME')
  })
})
