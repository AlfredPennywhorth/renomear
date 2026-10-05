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
