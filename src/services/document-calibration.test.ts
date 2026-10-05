import { describe, expect, it } from 'vitest'
import { classifyKnownHeader, scoreKnownHeader } from './document-calibration'

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

describe('classifyKnownHeader', () => {
  it('classifica C1 frente pelo cabeçalho fixo', () => {
    expect(classifyKnownHeader('CONGREGAÇÃO CRISTÃ NO BRASIL\nFICHA DE APRESENTAÇÃO DE CASO'))
      .toBe('FICHA_C1')
  })

  it('classifica verso/pedido de roupas pelo título', () => {
    expect(classifyKnownHeader('PEDIDO DE ROUPAS E DIVERSOS')).toBe('FICHA_C1_VERSO')
  })

  it('classifica declaração de trânsito', () => {
    expect(classifyKnownHeader('CONGREGAÇÃO CRISTÃ NO BRASIL\nDECLARAÇÃO DE TRÂNSITO'))
      .toBe('DECLARACAO_TRANSITO')
  })

  it('classifica envelope pelo bloco da reunião', () => {
    expect(classifyKnownHeader('OBRA DA PIEDADE\nPREENCHIDO NA REUNIÃO\nDATA DA REUNIÃO\nSEQUÊNCIA'))
      .toBe('ENVELOPE')
  })
})
