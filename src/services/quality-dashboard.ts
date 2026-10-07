import type { AnalyzedDocument, DocumentKind } from '../domain/document'
import type { InconsistencyRow } from './inconsistency-report'

export type TypeQualityRow = {
  kind: string
  total: number
  ok: number
  revisar: number
  naoConforme: number
}

export type QualityMetrics = {
  total: number
  evaluated: number
  pending: number
  ok: number
  revisar: number
  naoConforme: number
  conformityRate: number
  reviewCoverage: number
  issueCount: number
  topIssues: Array<{ label: string; count: number }>
  byType: TypeQualityRow[]
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

export function calculateQualityMetrics(
  documents: AnalyzedDocument[],
  inconsistencies: InconsistencyRow[],
): QualityMetrics {
  const pending = documents.filter((item) => item.reviewStatus === 'PENDENTE').length
  const ok = documents.filter((item) => item.reviewStatus === 'OK').length
  const revisar = documents.filter((item) => item.reviewStatus === 'REVISAR').length
  const naoConforme = documents.filter((item) => item.reviewStatus === 'NAO_CONFORME').length
  const evaluated = ok + revisar + naoConforme

  const issueMap = new Map<string, number>()
  for (const item of inconsistencies) {
    issueMap.set(item.inconsistencia, (issueMap.get(item.inconsistencia) ?? 0) + 1)
  }

  const typeMap = new Map<string, TypeQualityRow>()
  for (const document of documents) {
    const label = document.kind ? KIND_LABEL[document.kind] : 'Tipo não identificado'
    const current = typeMap.get(label) ?? {
      kind: label,
      total: 0,
      ok: 0,
      revisar: 0,
      naoConforme: 0,
    }
    current.total += 1
    if (document.reviewStatus === 'OK') current.ok += 1
    if (document.reviewStatus === 'REVISAR') current.revisar += 1
    if (document.reviewStatus === 'NAO_CONFORME') current.naoConforme += 1
    typeMap.set(label, current)
  }

  return {
    total: documents.length,
    evaluated,
    pending,
    ok,
    revisar,
    naoConforme,
    conformityRate: evaluated === 0 ? 0 : Math.round((ok / evaluated) * 100),
    reviewCoverage: documents.length === 0 ? 0 : Math.round((evaluated / documents.length) * 100),
    issueCount: inconsistencies.length,
    topIssues: [...issueMap.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'pt-BR'))
      .slice(0, 8),
    byType: [...typeMap.values()].sort((a, b) => b.total - a.total || a.kind.localeCompare(b.kind, 'pt-BR')),
  }
}
