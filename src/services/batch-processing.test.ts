import { describe, expect, it } from 'vitest'
import type { AnalyzedDocument } from '../domain/document'
import { analyzeBatch, isAutomaticRenameReady, reconcileReviewStatus, summarizeBatch } from './batch-processing'

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
    expect(result.suggestedName).toBe('001990_013068_DT.jpg')
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

  it('permite renomear C1 com identidade segura mesmo com auditoria pendente', () => {
    const [result] = analyzeBatch([
      doc({
        kind: 'FICHA_C1',
        prontuario: '2103',
        prontuarioConfidence: 0.95,
        prontuarioOcrSource: 'CONSENSUS',
        documentDate: '23/09/2026',
        caseMode: 'REUNIAO',
        confidence: 0.55,
      }),
    ])

    expect(result.reviewStatus).toBe('REVISAR')
    expect(isAutomaticRenameReady(result)).toBe(true)
  })

  it('aceita prontuário por consenso mesmo abaixo do limiar individual', () => {
    const result = doc({
      kind: 'FICHA_C1',
      prontuario: '002103',
      prontuarioConfidence: 0.61,
      prontuarioOcrSource: 'CONSENSUS',
      documentDate: null,
      confidence: 0.52,
      suggestedName: '002103_c1_frente.jpg',
      reviewStatus: 'REVISAR',
    })

    expect(isAutomaticRenameReady(result)).toBe(true)
  })

  it('não libera DT quando a sequência veio sem confiança própria', () => {
    const result = doc({
      kind: 'DECLARACAO_TRANSITO',
      prontuario: '001990',
      prontuarioConfidence: 0.96,
      prontuarioOcrSource: 'PADDLE',
      numeroDocumento: '013068',
      numeroDocumentoConfidence: null,
      documentDate: '02/09/2026',
      confidence: 0.99,
      suggestedName: '001990_013068_DT.jpg',
      reviewStatus: 'REVISAR',
    })

    expect(isAutomaticRenameReady(result)).toBe(false)
  })

  it('não libera renomeação automática de documento não conforme', () => {
    const [result] = analyzeBatch([
      doc({
        kind: 'DECLARACAO_TRANSITO',
        prontuario: '1990',
        numeroDocumento: '013068',
        documentDate: '02/09/2026',
        confidence: 0.95,
        reviewStatus: 'NAO_CONFORME',
      }),
    ])

    expect(isAutomaticRenameReady(result)).toBe(false)
  })

  it('não usa a data como requisito para salvar o nome do arquivo', () => {
    const result = doc({
      kind: 'DECLARACAO_TRANSITO',
      prontuario: '001990',
      prontuarioConfidence: 0.96,
      prontuarioOcrSource: 'PADDLE',
      numeroDocumento: '013068',
      numeroDocumentoConfidence: 0.94,
      documentDate: null,
      confidence: 0.55,
      suggestedName: '001990_013068_DT.jpg',
      reviewStatus: 'REVISAR',
    })

    expect(isAutomaticRenameReady(result)).toBe(true)
  })

  it('rebaixa OK quando nova validação cruzada vira não conforme', () => {
    const result = reconcileReviewStatus(doc({
      reviewStatus: 'OK',
      validations: [{
        id: 'cross-date-meeting',
        label: 'Data da reunião',
        value: '01/01/2026 x 02/01/2026',
        status: 'NAO_CONFORME',
      }],
    }))

    expect(result.reviewStatus).toBe('NAO_CONFORME')
  })

  it('não libera PDF com rotação física pendente', () => {
    const result = doc({
      kind: 'DECLARACAO_TRANSITO',
      prontuario: '001990',
      numeroDocumento: '013068',
      documentDate: '02/09/2026',
      confidence: 0.95,
      prontuarioConfidence: 0.95,
      prontuarioOcrSource: 'CONSENSUS',
      numeroDocumentoConfidence: 0.95,
      suggestedName: '001990_013068_DT.pdf',
      reviewStatus: 'REVISAR',
      validations: [{
        id: 'ocr-orientation-pdf',
        label: 'Orientação',
        value: '180°',
        status: 'REVISAR',
      }],
    })

    expect(isAutomaticRenameReady(result)).toBe(false)
  })

  it('não libera renomeação automática quando há erro de OCR', () => {
    const result = doc({
      kind: 'DECLARACAO_TRANSITO',
      prontuario: '001990',
      numeroDocumento: '013068',
      documentDate: '02/09/2026',
      confidence: 0.95,
      prontuarioConfidence: 0.95,
      prontuarioOcrSource: 'CONSENSUS',
      numeroDocumentoConfidence: 0.95,
      suggestedName: '001990_013068_DT.jpg',
      reviewStatus: 'REVISAR',
      validations: [{
        id: 'ocr-error',
        label: 'Leitura automática',
        value: null,
        status: 'REVISAR',
      }],
    })

    expect(isAutomaticRenameReady(result)).toBe(false)
  })

  it('rebaixa documento OK quando campo obrigatório fica inválido', () => {
    const result = reconcileReviewStatus(doc({
      kind: 'DECLARACAO_TRANSITO',
      prontuario: '001990',
      numeroDocumento: null,
      documentDate: '02/09/2026',
      suggestedName: '001990_DT.jpg',
      reviewStatus: 'OK',
      validations: [],
    }))

    expect(result.reviewStatus).toBe('REVISAR')
  })

  it('não libera renomeação automática com baixa confiança do prontuário', () => {
    const [result] = analyzeBatch([
      doc({
        kind: 'FICHA_C1',
        prontuario: '2103',
        prontuarioConfidence: 0.55,
        prontuarioOcrSource: 'TESSERACT',
        documentDate: '23/09/2026',
        caseMode: 'REUNIAO',
        confidence: 0.95,
      }),
    ])

    expect(isAutomaticRenameReady(result)).toBe(false)
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
