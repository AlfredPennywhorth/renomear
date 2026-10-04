import { describe, expect, it } from 'vitest'
import type { AnalyzedDocument } from '../domain/document'
import { buildInconsistencyCsv, collectInconsistencies } from './inconsistency-report'

function doc(overrides: Partial<AnalyzedDocument> = {}): AnalyzedDocument {
  return {
    id: '1',
    originalName: 'scan001.jpg',
    kind: 'FICHA_C1',
    prontuario: '004354',
    numeroDocumento: null,
    documentDate: '18/02/2026',
    caseMode: 'EMERGENCIA',
    isMonthly: false,
    suggestedName: '004354_c1_frente.jpg',
    confidence: null,
    reviewStatus: 'REVISAR',
    validations: [],
    ...overrides,
  }
}

describe('collectInconsistencies', () => {
  it('coleta validações para revisar e não conformes', () => {
    const rows = collectInconsistencies([
      doc({
        validations: [
          {
            id: 'date-emergency',
            label: 'Data da emergência',
            value: '18/02/2026 x 01/02/2026',
            status: 'NAO_CONFORME',
            note: 'A C1 deve usar a data do atendimento emergencial.',
          },
        ],
      }),
    ])

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      prontuario: '004354',
      gravidade: 'NAO_CONFORME',
      inconsistencia: 'Data da emergência',
    })
  })

  it('não inclui documentos OK sem inconsistências', () => {
    const rows = collectInconsistencies([
      doc({ reviewStatus: 'OK', validations: [] }),
    ])
    expect(rows).toEqual([])
  })

  it('gera CSV com cabeçalho e dados', () => {
    const csv = buildInconsistencyCsv([
      {
        prontuario: '004354',
        arquivo: 'scan001.jpg',
        tipo: 'Ficha C1 - frente',
        gravidade: 'REVISAR',
        inconsistencia: 'Assinatura',
        valorIdentificado: '',
        observacao: 'Nome ilegível',
      },
    ])
    expect(csv).toContain('Prontuário')
    expect(csv).toContain('004354')
    expect(csv).toContain('Nome ilegível')
  })
})
