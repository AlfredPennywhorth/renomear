import { describe, expect, it } from 'vitest'
import type { AnalyzedDocument } from '../domain/document'
import { pairAdjacentC1Versos } from './c1-pairing'

function doc(overrides: Partial<AnalyzedDocument>): AnalyzedDocument {
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
    reviewStatus: 'REVISAR',
    validations: [],
    ...overrides,
  }
}

describe('pairAdjacentC1Versos', () => {
  it('propõe nome para verso adjacente quando a frente tem identidade segura e os nomes corroboram', () => {
    const [front, verso] = pairAdjacentC1Versos([
      doc({
        originalName: '003626-010283-FDT_000.jpg',
        kind: 'FICHA_C1',
        prontuario: '003626',
        prontuarioConfidence: 0.94,
        prontuarioOcrSource: 'TESSERACT',
      }),
      doc({
        originalName: '003626-010283-FDT_001.jpg',
        kind: 'FICHA_C1_VERSO',
      }),
    ])

    expect(front.prontuario).toBe('003626')
    expect(verso.prontuario).toBe('003626')
    expect(verso.suggestedName).toBe('003626_c1_verso.jpg')
    expect(verso.reviewStatus).toBe('REVISAR')
    expect(verso.manualReviewApproved).toBe(false)
    expect(verso.validations.some((item) => item.id === 'ocr-c1-verso-inherited')).toBe(true)
  })

  it('aceita padrão sem separador antes do índice final', () => {
    const [, verso] = pairAdjacentC1Versos([
      doc({
        originalName: '004086-051292FEDT00001.jpg',
        kind: 'FICHA_C1',
        prontuario: '004086',
        prontuarioConfidence: 0.91,
        prontuarioOcrSource: 'TESSERACT',
      }),
      doc({
        originalName: '004086-051292FEDT00002.jpg',
        kind: 'FICHA_C1_VERSO',
      }),
    ])
    expect(verso.prontuario).toBe('004086')
  })

  it('não herda identidade quando o nome do verso não corrobora o prontuário', () => {
    const [, verso] = pairAdjacentC1Versos([
      doc({
        originalName: '003626-010283-FDT_000.jpg',
        kind: 'FICHA_C1',
        prontuario: '003626',
        prontuarioConfidence: 0.94,
        prontuarioOcrSource: 'TESSERACT',
      }),
      doc({
        originalName: '004999-outro_001.jpg',
        kind: 'FICHA_C1_VERSO',
      }),
    ])
    expect(verso.prontuario).toBeNull()
    expect(verso.suggestedName).toBeNull()
  })

  it('não herda de frente com identidade OCR insegura', () => {
    const [, verso] = pairAdjacentC1Versos([
      doc({
        originalName: '003626-010283-FDT_000.jpg',
        kind: 'FICHA_C1',
        prontuario: '003626',
        prontuarioConfidence: 0.4,
        prontuarioOcrSource: 'TESSERACT',
      }),
      doc({
        originalName: '003626-010283-FDT_001.jpg',
        kind: 'FICHA_C1_VERSO',
      }),
    ])
    expect(verso.prontuario).toBeNull()
  })
})
