import type { AnalyzedDocument, DocumentKind } from '../domain/document'

export type InconsistencySeverity = 'REVISAR' | 'NAO_CONFORME' | 'ERRO'

export type InconsistencyRow = {
  prontuario: string
  arquivo: string
  tipo: string
  gravidade: InconsistencySeverity
  inconsistencia: string
  valorIdentificado: string
  observacao: string
}

const KIND_LABEL: Record<DocumentKind, string> = {
  FICHA_C1: 'Ficha C1 - frente',
  FICHA_C1_VERSO: 'Ficha C1 - verso',
  ENVELOPE: 'Envelope/recibo',
  RECIBO_ATENDIMENTO: 'Recibo de atendimento',
  RECIBO_EMERGENCIA_MANUAL: 'Recibo manual de emergência',
  DECLARACAO_TRANSITO: 'Declaração de trânsito',
  NAO_PADRONIZADO: 'Documento não padronizado',
}

export function collectInconsistencies(documents: AnalyzedDocument[]): InconsistencyRow[] {
  const rows: InconsistencyRow[] = []

  for (const document of documents) {
    const base = {
      prontuario: document.prontuario ?? '',
      arquivo: document.originalName,
      tipo: document.kind ? KIND_LABEL[document.kind] : 'Tipo não identificado',
    }

    for (const validation of document.validations) {
      if (validation.status !== 'REVISAR' && validation.status !== 'NAO_CONFORME') continue
      rows.push({
        ...base,
        gravidade: validation.status,
        inconsistencia: validation.label,
        valorIdentificado: validation.value ?? '',
        observacao: validation.note ?? '',
      })
    }

    if (
      document.reviewStatus === 'REVISAR' &&
      !document.validations.some((item) => item.status === 'REVISAR')
    ) {
      rows.push({
        ...base,
        gravidade: 'REVISAR',
        inconsistencia: 'Documento marcado para revisão',
        valorIdentificado: '',
        observacao: 'Revisão manual pendente.',
      })
    }

    if (
      document.reviewStatus === 'NAO_CONFORME' &&
      !document.validations.some((item) => item.status === 'NAO_CONFORME')
    ) {
      rows.push({
        ...base,
        gravidade: 'NAO_CONFORME',
        inconsistencia: 'Documento marcado como não conforme',
        valorIdentificado: '',
        observacao: 'Não conformidade registrada na revisão manual.',
      })
    }

    if (document.renameState === 'ERRO') {
      rows.push({
        ...base,
        gravidade: 'ERRO',
        inconsistencia: 'Falha na renomeação',
        valorIdentificado: document.suggestedName ?? '',
        observacao: document.lastRenameError ?? 'Falha não detalhada.',
      })
    }
  }

  return rows
}

function csvCell(value: string): string {
  return '"' + value.replaceAll('"', '""') + '"'
}

export function buildInconsistencyCsv(rows: InconsistencyRow[]): string {
  const header = [
    'Prontuário',
    'Arquivo',
    'Tipo',
    'Gravidade',
    'Inconsistência',
    'Valor identificado',
    'Observação',
  ]

  const lines = [
    header.map(csvCell).join(';'),
    ...rows.map((row) =>
      [
        row.prontuario,
        row.arquivo,
        row.tipo,
        row.gravidade,
        row.inconsistencia,
        row.valorIdentificado,
        row.observacao,
      ].map(csvCell).join(';'),
    ),
  ]

  return '\uFEFF' + lines.join('\r\n')
}

export function downloadInconsistencyCsv(rows: InconsistencyRow[]): void {
  const blob = new Blob([buildInconsistencyCsv(rows)], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)
  link.href = url
  link.download = 'renomear-inconsistencias-' + date + '.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
