import { describe, expect, it } from 'vitest'
import type { AnalyzedDocument } from '../domain/document'
import { suggestFileName } from './naming'

function base(overrides: Partial<AnalyzedDocument> = {}): AnalyzedDocument {
  return {
    id: '1',
    originalName: 'scan001.jpg',
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

describe('suggestFileName', () => {
  it('gera o padrão real do envelope', () => {
    expect(suggestFileName(base({
      kind: 'ENVELOPE',
      prontuario: '2103',
      numeroDocumento: '054831',
    }))).toBe('002103_054831_env_frente.jpg')
  })

  it('gera DT com prontuário e número do documento', () => {
    expect(suggestFileName(base({
      kind: 'DECLARACAO_TRANSITO',
      prontuario: '1072',
      numeroDocumento: '003604',
    }))).toBe('001072_003604_DT.jpg')
  })

  it('preserva a extensão em minúsculas', () => {
    expect(suggestFileName(base({
      originalName: 'FOTO.JPEG',
      kind: 'ENVELOPE',
      prontuario: '002103',
      numeroDocumento: '054831',
    }))).toBe('002103_054831_env_frente.jpeg')
  })

  it('não gera nome sem tipo ou prontuário', () => {
    expect(suggestFileName(base())).toBeNull()
  })
})
