import type { AnalyzedDocument, DocumentKind } from '../domain/document'
import { normalizeProntuario } from '../domain/prontuario'

const KIND_LABEL: Record<DocumentKind, string> = {
  FICHA_C1: 'c1_frente',
  FICHA_C1_VERSO: 'c1_verso',
  ENVELOPE: 'env_frente',
  RECIBO_ATENDIMENTO: 'recibo',
  RECIBO_EMERGENCIA_MANUAL: 'rec_emergencia',
  DECLARACAO_TRANSITO: 'dt',
  NAO_PADRONIZADO: 'documento',
}

function extensionOf(name: string): string {
  const index = name.lastIndexOf('.')
  return index >= 0 ? name.slice(index + 1).toLowerCase() : ''
}

export function suggestFileName(document: AnalyzedDocument): string | null {
  if (!document.kind || !document.prontuario) return null

  const prontuario = normalizeProntuario(document.prontuario)
  if (!prontuario) return null

  const ext = extensionOf(document.originalName)
  const type = KIND_LABEL[document.kind]
  const sequence = document.numeroDocumento?.replace(/\D/g, '') || null

  if (document.kind === 'ENVELOPE' && sequence) {
    return `${prontuario}_${sequence}_${type}.${ext}`
  }

  if (sequence) {
    return `${prontuario}_${sequence}_${type}.${ext}`
  }

  return `${prontuario}_${type}.${ext}`
}
