import { describe, expect, it } from 'vitest'
import { paddleNumericCandidate } from './paddle-ocr'

describe('paddleNumericCandidate', () => {
  it('normaliza prontuário numérico válido', () => {
    expect(paddleNumericCandidate({ text: '1206', score: 0.93 })).toEqual({
      value: '001206',
      confidence: 0.93,
      rawText: '1206',
    })
  })

  it('rejeita leitura alfanumérica para não inventar prontuário', () => {
    expect(paddleNumericCandidate({ text: 'I206', score: 0.99 })).toBeNull()
  })

  it('rejeita zero absoluto como prontuário', () => {
    expect(paddleNumericCandidate({ text: '000000', score: 0.99 })).toBeNull()
  })

  it('normaliza confiança percentual quando necessário', () => {
    expect(paddleNumericCandidate({ text: '3750', score: 91 })?.confidence).toBe(0.91)
  })
})
