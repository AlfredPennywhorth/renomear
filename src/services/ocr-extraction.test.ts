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

  it('extrai prontuário de envelope quando o rótulo usa Nº', () => {
    const result = extractOcrFields(`
OBRA DA PIEDADE
Prontuário Nº 000136
Data da Reunião 05/10/2024
Sequência 041972
C - Mensal R$ 800,00
`)

    expect(result.kind).toBe('ENVELOPE')
    expect(result.prontuario).toBe('000136')
    expect(result.numeroDocumento).toBe('041972')
    expect(result.documentDate).toBe('05/10/2024')
    expect(result.isMonthly).toBe(true)
  })
})
