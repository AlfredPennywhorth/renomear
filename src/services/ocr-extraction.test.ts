import { describe, expect, it } from 'vitest'
import { extractOcrFields } from './ocr-extraction'

describe('extractOcrFields — Declaração de trânsito', () => {
  it('extrai prontuário e número da DT quando o cabeçalho usa Nº', () => {
    const result = extractOcrFields(`
CONGREGAÇÃO CRISTÃ NO BRASIL
Declaração de trânsito
Nº 003604
05/10/2024
Prontuário 001072
`)

    expect(result.kind).toBe('DECLARACAO_TRANSITO')
    expect(result.numeroDocumento).toBe('003604')
    expect(result.prontuario).toBe('001072')
    expect(result.documentDate).toBe('05/10/2024')
  })
})
