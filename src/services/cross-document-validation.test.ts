import { describe, expect, it } from 'vitest'
import type { AnalyzedDocument } from '../domain/document'
import { applyCrossDocumentValidations } from './cross-document-validation'

function doc(overrides: Partial<AnalyzedDocument>): AnalyzedDocument {
  return {
    id: crypto.randomUUID(),
    originalName: 'arquivo.jpg',
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

describe('applyCrossDocumentValidations', () => {
  it('não exige C1 para atendimento mensal', () => {
    const envelope = doc({
      kind: 'ENVELOPE',
      prontuario: '001967',
      documentDate: '05/09/2026',
      isMonthly: true,
    })
    const result = applyCrossDocumentValidations([envelope])[0]
    expect(result.validations[0].status).toBe('OK')
  })

  it('exige data igual quando a C1 é reunião', () => {
    const c1 = doc({
      kind: 'FICHA_C1',
      prontuario: '1967',
      documentDate: '05/09/2026',
      caseMode: 'REUNIAO',
    })
    const envelope = doc({
      kind: 'ENVELOPE',
      prontuario: '001967',
      documentDate: '05/09/2026',
    })
    const result = applyCrossDocumentValidations([c1, envelope])[1]
    expect(result.validations[0].status).toBe('OK')
  })

  it('marca não conforme quando reunião tem data diferente', () => {
    const c1 = doc({
      kind: 'FICHA_C1',
      prontuario: '001967',
      documentDate: '04/09/2026',
      caseMode: 'REUNIAO',
    })
    const envelope = doc({
      kind: 'ENVELOPE',
      prontuario: '001967',
      documentDate: '05/09/2026',
    })
    const result = applyCrossDocumentValidations([c1, envelope])[1]
    expect(result.validations[0].status).toBe('NAO_CONFORME')
  })

  it('aceita emergência anterior à data da reunião', () => {
    const c1 = doc({
      kind: 'FICHA_C1',
      prontuario: '001967',
      documentDate: '02/09/2026',
      caseMode: 'EMERGENCIA',
    })
    const envelope = doc({
      kind: 'RECIBO_ATENDIMENTO',
      prontuario: '001967',
      documentDate: '05/09/2026',
    })
    const result = applyCrossDocumentValidations([c1, envelope])[1]
    expect(result.validations[0].status).toBe('OK')
  })
})
