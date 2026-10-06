import { describe, expect, it, vi, afterEach } from 'vitest'
import { classifyKnownHeader, scoreKnownHeader, chooseDocumentOrientation, detectDocumentOrientation } from './document-calibration'

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


describe('orientação segura', () => {
  afterEach(() => vi.unstubAllGlobals())

  it.each([0, 90, 180, 270] as const)('seleciona %s° com título inequívoco', (rotation) => {
    const headerText = 'FICHA DE APRESENTAÇÃO DE CASO'
    expect(chooseDocumentOrientation([
      { rotation, score: scoreKnownHeader(headerText), headerText },
      { rotation: rotation === 0 ? 90 : 0, score: 0, headerText: '' },
    ])?.rotation).toBe(rotation)
  })

  it('recusa empate e cabeçalho institucional genérico', () => {
    const headerText = 'DECLARAÇÃO DE TRÂNSITO'
    expect(chooseDocumentOrientation([
      { rotation: 0, score: 8, headerText },
      { rotation: 180, score: 8, headerText },
    ])).toBeNull()
    expect(chooseDocumentOrientation([
      { rotation: 0, score: 5, headerText: 'CONGREGAÇÃO CRISTÃ NO BRASIL' },
    ])).toBeNull()
  })

  function canvas() {
    return { width: 600, height: 850, getContext: () => ({
      fillRect() {}, translate() {}, rotate() {}, drawImage() {},
    }) } as unknown as HTMLCanvasElement
  }

  it.each([0, 90, 180, 270] as const)('usa página inteira quando o título de %s° fica fora do topo', async (rotation) => {
    vi.stubGlobal('document', { createElement: () => canvas() })
    let call = 0
    const worker = {
      setParameters: vi.fn(),
      recognize: vi.fn(async () => {
        const index = call++
        return { data: { text: index === 4 + rotation / 90 ? 'DECLARAÇÃO DE TRÂNSITO' : '' } }
      }),
    }
    const result = await detectDocumentOrientation(worker as never, canvas())
    expect(result.certain).toBe(true)
    expect(result.rotation).toBe(rotation)
    expect(worker.recognize).toHaveBeenCalledTimes(8)
  })

  it('preserva a imagem sem afirmar 0° quando não há evidência', async () => {
    vi.stubGlobal('document', { createElement: () => canvas() })
    const source = canvas()
    const worker = { setParameters: vi.fn(), recognize: vi.fn(async () => ({ data: { text: '' } })) }
    const result = await detectDocumentOrientation(worker as never, source)
    expect(result.certain).toBe(false)
    expect(result.canvas).toBe(source)
  })
})
