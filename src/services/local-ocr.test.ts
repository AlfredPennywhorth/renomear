import { describe, expect, it } from 'vitest'
import { extractOcrFields } from './ocr-extraction'

describe('extractOcrFields', () => {
  it('classifica ficha C1 sem adivinhar modalidade apenas pelas opções impressas', () => {
    const fields = extractOcrFields(`
      FICHA DE APRESENTAÇÃO DE CASO
      Reunião   Emergência
      Prontuário: 2103
      23/09/2026
    `)

    expect(fields.kind).toBe('FICHA_C1')
    expect(fields.prontuario).toBe('002103')
    expect(fields.documentDate).toBe('23/09/2026')
    expect(fields.caseMode).toBeNull()
  })

  it('classifica declaração de trânsito e extrai campos rotulados', () => {
    const fields = extractOcrFields(`
      Declaração de trânsito
      Prontuário: 1990
      Número do documento: 013068
      02/09/2026
    `)

    expect(fields.kind).toBe('DECLARACAO_TRANSITO')
    expect(fields.prontuario).toBe('001990')
    expect(fields.numeroDocumento).toBe('013068')
    expect(fields.documentDate).toBe('02/09/2026')
  })

  it('não escolhe uma data arbitrária quando há mais de uma data sem rótulo', () => {
    const fields = extractOcrFields(`
      FICHA DE APRESENTAÇÃO DE CASO
      Prontuário: 4354
      01/02/2026
      18/02/2026
    `)

    expect(fields.documentDate).toBeNull()
  })

  it('aceita Data da Reunião rotulada mesmo quando há outras datas', () => {
    const fields = extractOcrFields(`
      Data da Reunião: 18/02/2026
      Sequência: 051128
      Prontuário: 4354
      01/02/2026
    `)

    expect(fields.kind).toBe('ENVELOPE')
    expect(fields.documentDate).toBe('18/02/2026')
    expect(fields.numeroDocumento).toBe('051128')
    expect(fields.prontuario).toBe('004354')
  })

  it('marca mensal somente quando a palavra estiver explícita', () => {
    expect(extractOcrFields('Mensal R$ 1.500,00').isMonthly).toBe(true)
    expect(extractOcrFields('R$ 1.500,00').isMonthly).toBe(false)
  })
})
