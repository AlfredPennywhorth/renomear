import type { AnalyzedDocument } from '../domain/document'
import { normalizeProntuario } from '../domain/prontuario'
import { validateBrazilianDate, validateSequence } from '../domain/validation'
import { applyCrossDocumentValidations } from './cross-document-validation'
import { suggestFileName } from './naming'

function hasRequiredFields(document: AnalyzedDocument): boolean {
  if (!document.kind) return false
  if (!document.prontuario || !normalizeProntuario(document.prontuario)) return false

  const sequenceRequired =
    document.kind === 'ENVELOPE' ||
    document.kind === 'RECIBO_ATENDIMENTO' ||
    document.kind === 'DECLARACAO_TRANSITO'

  if (sequenceRequired && (!document.numeroDocumento || !validateSequence(document.numeroDocumento).ok)) {
    return false
  }

  const dateRequired =
    document.kind === 'ENVELOPE' ||
    document.kind === 'RECIBO_ATENDIMENTO' ||
    document.kind === 'FICHA_C1' ||
    document.kind === 'DECLARACAO_TRANSITO' ||
    document.kind === 'RECIBO_EMERGENCIA_MANUAL'

  if (dateRequired && (!document.documentDate || !validateBrazilianDate(document.documentDate).ok)) {
    return false
  }

  if (document.kind === 'FICHA_C1' && !document.caseMode) return false
  if (document.kind === 'FICHA_C1_VERSO' && !document.prontuario) return false

  return true
}

function statusFromValidations(document: AnalyzedDocument): AnalyzedDocument['reviewStatus'] {
  if (document.validations.some((item) => item.status === 'NAO_CONFORME')) return 'NAO_CONFORME'
  if (document.validations.some((item) => item.status === 'REVISAR')) return 'REVISAR'
  if (hasRequiredFields(document) && document.suggestedName) return 'OK'
  return 'REVISAR'
}

/**
 * Motor de lote atual.
 *
 * A interface já trabalha no fluxo "automático primeiro, exceções depois".
 * Enquanto OCR/classificação visual não estiverem integrados, documentos sem
 * campos suficientes seguem para REVISAR em vez de serem adivinhados.
 */
export function analyzeBatch(documents: AnalyzedDocument[]): AnalyzedDocument[] {
  const named = documents.map((document) => {
    const next = { ...document }
    next.suggestedName = suggestFileName(next)
    return next
  })

  const crossValidated = applyCrossDocumentValidations(named)

  return crossValidated.map((document) => ({
    ...document,
    reviewStatus:
      document.reviewStatus === 'NAO_CONFORME'
        ? 'NAO_CONFORME'
        : statusFromValidations(document),
  }))
}

export type BatchAnalysisSummary = {
  total: number
  automaticos: number
  revisar: number
  naoConformes: number
}

export function summarizeBatch(documents: AnalyzedDocument[]): BatchAnalysisSummary {
  return {
    total: documents.length,
    automaticos: documents.filter((item) => item.reviewStatus === 'OK').length,
    revisar: documents.filter((item) => item.reviewStatus === 'REVISAR').length,
    naoConformes: documents.filter((item) => item.reviewStatus === 'NAO_CONFORME').length,
  }
}
