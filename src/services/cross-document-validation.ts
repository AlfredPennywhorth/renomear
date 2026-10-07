import type { AnalyzedDocument, DocumentValidation } from '../domain/document'
import { normalizeProntuario } from '../domain/prontuario'
import { validateBrazilianDate } from '../domain/validation'

const CROSS_PREFIX = 'cross-'

function parseDate(value: string): number | null {
  const validation = validateBrazilianDate(value)
  if (!validation.ok || !validation.normalized) return null
  const [day, month, year] = validation.normalized.split('/').map(Number)
  return Date.UTC(year, month - 1, day)
}

function sameProntuario(a: AnalyzedDocument, b: AnalyzedDocument): boolean {
  if (!a.prontuario || !b.prontuario) return false
  const pa = normalizeProntuario(a.prontuario)
  const pb = normalizeProntuario(b.prontuario)
  return Boolean(pa && pb && pa === pb)
}

function crossValidation(
  id: string,
  label: string,
  status: DocumentValidation['status'],
  value: string | null,
  note?: string,
): DocumentValidation {
  return { id: CROSS_PREFIX + id, label, status, value, note }
}

function evaluateReceiptOrEnvelope(
  document: AnalyzedDocument,
  all: AnalyzedDocument[],
): DocumentValidation[] {
  if (document.kind !== 'ENVELOPE' && document.kind !== 'RECIBO_ATENDIMENTO') return []

  if (document.isMonthly) {
    return [
      crossValidation(
        'c1-not-required',
        'Correspondência com Ficha C1',
        'OK',
        'Não exigida',
        'Atendimento identificado como mensal; não é esperada Ficha C1 correspondente.',
      ),
    ]
  }

  const matchingC1 = all.filter(
    (candidate) => candidate.kind === 'FICHA_C1' && sameProntuario(candidate, document),
  )

  if (matchingC1.length === 0) {
    return [
      crossValidation(
        'c1-missing',
        'Correspondência com Ficha C1',
        'REVISAR',
        'Não localizada',
        'Atendimento não mensal: verificar se existe Ficha C1 com o mesmo prontuário.',
      ),
    ]
  }

  if (matchingC1.length > 1) {
    return [
      crossValidation(
        'c1-multiple',
        'Correspondência com Ficha C1',
        'REVISAR',
        String(matchingC1.length) + ' fichas localizadas',
        'Há mais de uma Ficha C1 com o mesmo prontuário no lote.',
      ),
    ]
  }

  const c1 = matchingC1[0]

  if (!c1.caseMode) {
    return [
      crossValidation(
        'c1-case-mode',
        'Tipo de atendimento na Ficha C1',
        'REVISAR',
        'Não identificado',
        'É necessário identificar se a Ficha C1 está marcada como REUNIÃO ou EMERGÊNCIA.',
      ),
    ]
  }

  if (!c1.documentDate || !document.documentDate) {
    return [
      crossValidation(
        'date-missing',
        'Coerência de datas C1 x envelope/recibo',
        'REVISAR',
        'Data ausente',
        'As duas datas precisam estar legíveis para aplicar a regra temporal.',
      ),
    ]
  }

  const c1Date = parseDate(c1.documentDate)
  const receiptDate = parseDate(document.documentDate)

  if (c1Date === null || receiptDate === null) {
    return [
      crossValidation(
        'date-invalid',
        'Coerência de datas C1 x envelope/recibo',
        'REVISAR',
        'Data inválida',
        'Corrija as datas antes da conferência entre documentos.',
      ),
    ]
  }

  if (c1.caseMode === 'REUNIAO') {
    const ok = c1Date === receiptDate
    return [
      crossValidation(
        'date-meeting',
        'Data da reunião',
        ok ? 'OK' : 'NAO_CONFORME',
        c1.documentDate + ' x ' + document.documentDate,
        ok
          ? 'Ficha C1 marcada como REUNIÃO: as datas coincidem.'
          : 'Ficha C1 marcada como REUNIÃO: a data deve ser igual à do envelope/recibo.',
      ),
    ]
  }

  const ok = c1Date < receiptDate
  return [
    crossValidation(
      'date-emergency',
      'Data da emergência',
      ok ? 'OK' : 'NAO_CONFORME',
      c1.documentDate + ' x ' + document.documentDate,
      ok
        ? 'Ficha C1 marcada como EMERGÊNCIA: a data é anterior à reunião do envelope/recibo.'
        : 'Ficha C1 marcada como EMERGÊNCIA: a data deve ser anterior à data da reunião do envelope/recibo.',
    ),
  ]
}

export function applyCrossDocumentValidations(
  documents: AnalyzedDocument[],
): AnalyzedDocument[] {
  return documents.map((document) => {
    const retained = document.validations.filter((item) => !item.id.startsWith(CROSS_PREFIX))
    const cross = evaluateReceiptOrEnvelope(document, documents)
    return { ...document, validations: [...retained, ...cross] }
  })
}
