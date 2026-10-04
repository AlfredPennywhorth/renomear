import { describe, expect, it } from 'vitest'
import { scoreKnownHeader } from './document-calibration'

describe('scoreKnownHeader', () => {
  it('reconhece cabeçalho de ficha C1', () => {
    expect(scoreKnownHeader('FICHA DE APRESENTAÇÃO DE CASO')).toBeGreaterThan(0)
  })

  it('reconhece cabeçalho de declaração de trânsito', () => {
    expect(scoreKnownHeader('CONGREGAÇÃO CRISTÃ NO BRASIL\nDeclaração de trânsito')).toBeGreaterThan(8)
  })

  it('não pontua texto sem sinais conhecidos', () => {
    expect(scoreKnownHeader('arquivo digitalizado sem cabeçalho reconhecível')).toBe(0)
  })
})
