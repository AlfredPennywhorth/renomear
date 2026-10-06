import type { AnalyzedDocument } from '../domain/document'
import { normalizeProntuario } from '../domain/prontuario'
import { suggestFileName } from './naming'

function safeIdentity(document: AnalyzedDocument): boolean {
  if (!document.prontuario || !normalizeProntuario(document.prontuario)) return false
  if (document.prontuarioOcrSource === 'MANUAL') return true

  const confidence = document.prontuarioConfidence ?? 0
  if (document.prontuarioOcrSource === 'CONSENSUS') return confidence >= 0.55
  if (document.prontuarioOcrSource === 'PADDLE') return confidence >= 0.84
  if (document.prontuarioOcrSource === 'TESSERACT') return confidence >= 0.88
  return Boolean(document.manualReviewApproved)
}

function filenameContainsProntuario(fileName: string, prontuario: string): boolean {
  const runs = fileName.match(/\d{1,8}/g) ?? []
  return runs.some((run) => normalizeProntuario(run) === prontuario)
}

export function pairAdjacentC1Versos(documents: AnalyzedDocument[]): AnalyzedDocument[] {
  return documents.map((document, index) => {
    if (document.kind !== 'FICHA_C1_VERSO' || document.prontuario) return document

    const front = documents[index - 1]
    if (!front || front.kind !== 'FICHA_C1' || !safeIdentity(front) || !front.prontuario) {
      return document
    }

    const prontuario = normalizeProntuario(front.prontuario)
    if (
      !prontuario ||
      !filenameContainsProntuario(front.originalName, prontuario) ||
      !filenameContainsProntuario(document.originalName, prontuario)
    ) {
      return document
    }

    const next: AnalyzedDocument = {
      ...document,
      prontuario,
      prontuarioConfidence: null,
      prontuarioOcrSource: null,
      manualReviewApproved: false,
      reviewStatus: 'REVISAR',
      validations: [
        ...document.validations.filter((item) => item.id !== 'ocr-c1-verso-inherited'),
        {
          id: 'ocr-c1-verso-inherited',
          label: 'Vínculo com Ficha C1 frente',
          value: prontuario,
          status: 'REVISAR',
          note: 'Prontuário herdado da C1 imediatamente anterior e corroborado pelos nomes atuais dos dois arquivos. Confira o vínculo antes de aprovar.',
        },
      ],
    }
    next.suggestedName = suggestFileName(next)
    return next
  })
}
