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

const AUTO_RULE_COVERAGE = new Set<AnalyzedDocument['kind']>([
  'DECLARACAO_TRANSITO',
])

function withRuleCoverage(document: AnalyzedDocument): AnalyzedDocument {
  const retained = document.validations.filter((item) => item.id !== 'automation-rule-coverage')

  if (!document.kind || AUTO_RULE_COVERAGE.has(document.kind)) {
    return { ...document, validations: retained }
  }

  return {
    ...document,
    validations: [
      ...retained,
      {
        id: 'automation-rule-coverage',
        label: 'Cobertura da auditoria automática',
        value: document.kind,
        status: 'REVISAR',
        note: 'Este tipo ainda possui regras institucionais que exigem conferência humana nesta versão.',
      },
    ],
  }
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
 * OCR/classificação alimentam este motor, mas somente tipos cuja cobertura
 * automática de regras está explicitamente liberada podem virar OK sem humano.
 */
export function analyzeBatch(documents: AnalyzedDocument[]): AnalyzedDocument[] {
  const named = documents.map((document) => {
    const next = { ...document }
    next.suggestedName = suggestFileName(next)
    return next
  })

  const crossValidated = applyCrossDocumentValidations(named)
  const coverageValidated = crossValidated.map(withRuleCoverage)

  return coverageValidated.map((document) => ({
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


export function isAutomaticRenameReady(document: AnalyzedDocument): boolean {
  if (!document.suggestedName || !document.kind || !document.prontuario) return false
  if (!normalizeProntuario(document.prontuario)) return false
  if ((document.confidence ?? 0) < 0.72) return false

  if (
    (document.kind === 'ENVELOPE' ||
      document.kind === 'RECIBO_ATENDIMENTO' ||
      document.kind === 'DECLARACAO_TRANSITO') &&
    (!document.numeroDocumento || !validateSequence(document.numeroDocumento).ok)
  ) {
    return false
  }

  const hasOcrBlock = document.validations.some(
    (item) => item.id === 'ocr-confidence' && item.status === 'REVISAR',
  )
  return !hasOcrBlock
}
