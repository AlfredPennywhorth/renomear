import type { AnalyzedDocument } from '../domain/document'

export function sequencePatchFromManualEdit(
  document: AnalyzedDocument,
  value: string,
): Partial<AnalyzedDocument> | null {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  const currentDigits = (document.numeroDocumento ?? '').replace(/\D/g, '').slice(0, 8)

  if (digits === currentDigits) return null

  return {
    numeroDocumento: digits || null,
    numeroDocumentoConfidence: digits ? 1 : null,
    numeroDocumentoOcrSource: digits ? 'MANUAL' : null,
  }
}

export function shouldInvalidateRenameState(
  document: AnalyzedDocument,
  patch: Partial<AnalyzedDocument>,
  nextSuggestedName: string | null,
): boolean {
  const nameFields = new Set(['kind', 'prontuario', 'numeroDocumento'])
  const touchesName = Object.keys(patch).some((key) => nameFields.has(key))

  if (!touchesName) return false
  if (nextSuggestedName === document.suggestedName) return false

  return document.renameState === 'RENOMEADO' || document.renameState === 'ERRO'
}

export function rotateDocumentManually(
  document: AnalyzedDocument,
  direction: 'LEFT' | 'RIGHT',
): AnalyzedDocument {
  const rotation = (((document.rotationDegrees ?? 0) + (direction === 'RIGHT' ? 90 : 270)) % 360) as 0 | 90 | 180 | 270
  const baseline = document.rotationEditBaseline ?? {
    rotationDegrees: document.rotationDegrees ?? 0,
    originalName: document.originalName,
    suggestedName: document.suggestedName,
    renameState: document.renameState,
    lastRenameError: document.lastRenameError,
  }
  const returnedToBaseline = rotation === baseline.rotationDegrees
  const canRestore = returnedToBaseline &&
    document.originalName === baseline.originalName &&
    document.suggestedName === baseline.suggestedName
  return {
    ...document,
    rotationEditBaseline: returnedToBaseline ? undefined : baseline,
    rotationDegrees: rotation,
    manualReviewApproved: false,
    reviewStatus: document.reviewStatus === 'NAO_CONFORME' ? 'NAO_CONFORME' : 'REVISAR',
    renameState: canRestore ? baseline.renameState : 'NAO_RENOMEADO',
    lastRenameError: canRestore ? baseline.lastRenameError : null,
    validations: [
      ...document.validations.filter(item => item.id !== 'ocr-orientation' && item.id !== 'ocr-orientation-uncertain' && item.id !== 'manual-orientation-review'),
      {
        id: 'manual-orientation-review', label: 'Conferência após giro manual',
        value: rotation + '°', status: 'REVISAR',
        note: 'Confira os campos após o giro. A imagem será gravada nesta orientação após confirmar a renomeação.',
      },
    ],
  }
}
