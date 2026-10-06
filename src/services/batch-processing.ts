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


export function hasOperationalReviewBlock(document: AnalyzedDocument): boolean {
  return document.validations.some(
    (item) =>
      item.status === 'REVISAR' &&
      (item.id === 'ocr-empty-file' || item.id === 'ocr-orientation-pdf'),
  )
}

export function isAutomaticRenameReady(document: AnalyzedDocument): boolean {
  if (document.reviewStatus === 'NAO_CONFORME') return false
  if (document.validations.some((item) => item.status === 'NAO_CONFORME')) return false
  if (hasOperationalReviewBlock(document)) return false
  if (!document.suggestedName || !document.kind || !document.prontuario) return false
  if (document.kind === 'NAO_PADRONIZADO') return false
  if (!normalizeProntuario(document.prontuario)) return false

  const prontuarioThreshold =
    document.prontuarioOcrSource === 'MANUAL'
      ? 1
      : document.prontuarioOcrSource === 'CONSENSUS'
        ? 0.55
        : 0.84
  const prontuarioConfidence =
    document.prontuarioOcrSource === 'MANUAL'
      ? 1
      : document.prontuarioConfidence ?? 0
  if (prontuarioConfidence < prontuarioThreshold) return false

  const sequenceRequired =
    document.kind === 'ENVELOPE' ||
    document.kind === 'RECIBO_ATENDIMENTO' ||
    document.kind === 'DECLARACAO_TRANSITO'

  if (
    sequenceRequired &&
    (
      !document.numeroDocumento ||
      !validateSequence(document.numeroDocumento).ok ||
      (document.numeroDocumentoConfidence ?? 0) < 0.8
    )
  ) {
    return false
  }

  const hasIdentityBlock = document.validations.some(
    (item) =>
      (
        item.id === 'ocr-error' ||
        item.id === 'ocr-prontuario-ambiguous' ||
        item.id === 'ocr-prontuario-conflict' ||
        item.id === 'ocr-identity-confidence' ||
        item.id === 'ocr-paddle-unavailable' ||
        item.id === 'ocr-orientation-pdf' ||
        item.id === 'ocr-orientation-uncertain' ||
        item.id === 'manual-orientation-review'
      ) &&
      item.status === 'REVISAR',
  )

  return !hasIdentityBlock
}


export function isRenameReady(document: AnalyzedDocument): boolean {
  if (hasOperationalReviewBlock(document)) return false
  if (document.reviewStatus === 'NAO_CONFORME') return false
  if (document.validations.some((item) => item.status === 'NAO_CONFORME')) return false
  if (!document.suggestedName || !document.kind || !document.prontuario) return false
  if (document.kind === 'NAO_PADRONIZADO') return false
  if (!normalizeProntuario(document.prontuario)) return false

  const sequenceRequired =
    document.kind === 'ENVELOPE' ||
    document.kind === 'RECIBO_ATENDIMENTO' ||
    document.kind === 'DECLARACAO_TRANSITO'

  if (
    sequenceRequired &&
    (!document.numeroDocumento || !validateSequence(document.numeroDocumento).ok)
  ) {
    return false
  }

  if (document.manualReviewApproved) return true
  return isAutomaticRenameReady(document)
}


export function reconcileReviewStatus(document: AnalyzedDocument): AnalyzedDocument {
  if (document.validations.some((item) => item.status === 'NAO_CONFORME')) {
    return { ...document, manualReviewApproved: false, reviewStatus: 'NAO_CONFORME' }
  }
  if (hasOperationalReviewBlock(document)) {
    return { ...document, manualReviewApproved: false, reviewStatus: 'REVISAR' }
  }
  if (document.manualReviewApproved) {
    return { ...document, reviewStatus: 'OK' }
  }
  if (document.validations.some((item) => item.status === 'REVISAR')) {
    return { ...document, reviewStatus: 'REVISAR' }
  }
  if (
    document.reviewStatus === 'OK' &&
    (!hasRequiredFields(document) || !document.suggestedName)
  ) {
    return { ...document, reviewStatus: 'REVISAR' }
  }
  return document
}
