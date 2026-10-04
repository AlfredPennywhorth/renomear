import { describe, expect, it } from 'vitest'
import { chooseReadableOrientation, REJECTION_MESSAGE } from './orientation'

describe('chooseReadableOrientation', () => {
  it('mantém documento que já está na posição correta', () => {
    expect(chooseReadableOrientation([
      { orientation: 0, confidence: 0.96 },
      { orientation: 90, confidence: 0.12 },
      { orientation: 180, confidence: 0.08 },
      { orientation: 270, confidence: 0.10 },
    ])).toMatchObject({
      status: 'OK',
      orientation: 0,
      autoCorrected: false,
    })
  })

  it('aceita documento de lado quando outra rotação tem alta confiança', () => {
    expect(chooseReadableOrientation([
      { orientation: 0, confidence: 0.18 },
      { orientation: 90, confidence: 0.94 },
      { orientation: 180, confidence: 0.11 },
      { orientation: 270, confidence: 0.22 },
    ])).toMatchObject({
      status: 'OK',
      orientation: 90,
      autoCorrected: true,
    })
  })

  it('rejeita quando nenhuma orientação atinge confiança mínima', () => {
    const result = chooseReadableOrientation([
      { orientation: 0, confidence: 0.42 },
      { orientation: 90, confidence: 0.49 },
      { orientation: 180, confidence: 0.35 },
      { orientation: 270, confidence: 0.44 },
    ])

    expect(result.status).toBe('REJEITADO')
    expect(result.message).toBe(REJECTION_MESSAGE)
  })
})
