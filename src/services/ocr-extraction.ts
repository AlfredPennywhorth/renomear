import type { AnalyzedDocument, DocumentKind } from '../domain/document'
import { normalizeProntuario } from '../domain/prontuario'

export type OcrFields = {
  kind: DocumentKind | null
  prontuario: string | null
  numeroDocumento: string | null
  documentDate: string | null
  caseMode: AnalyzedDocument['caseMode']
  isMonthly: boolean
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) return match[1]
  }
  return null
}

function classify(text: string): DocumentKind | null {
  const normalized = normalizeText(text)

  if (normalized.includes('FICHA DE APRESENTACAO DE CASO')) return 'FICHA_C1'
  if (normalized.includes('PEDIDO DE ROUPAS E DIVERSOS')) return 'FICHA_C1_VERSO'
  if (normalized.includes('DECLARACAO DE TRANSITO')) return 'DECLARACAO_TRANSITO'
  if (normalized.includes('RECIBO DE ATENDIMENTO') && normalized.includes('OBRA DA PIEDADE')) {
    return 'RECIBO_EMERGENCIA_MANUAL'
  }

  const hasMeetingDate = /DATA\s+(?:DA\s+)?REUNIAO/.test(normalized)
  const hasSequence = /SEQUENCIA|SEQ\.?/.test(normalized)
  if (hasMeetingDate && hasSequence) return 'ENVELOPE'

  return null
}

export function extractOcrFields(rawText: string): OcrFields {
  const text = normalizeText(rawText)
  const kind = classify(rawText)

  const prontuarioRaw = firstMatch(text, [
    /PRONTUARIO\s*[:#-]?\s*(\d{1,6})\b/,
    /PRONT\.?\s*[:#-]?\s*(\d{1,6})\b/,
  ])

  const sequence = firstMatch(text, [
    /SEQUENCIA\s*[:#-]?\s*(\d{4,8})\b/,
    /SEQ\.?\s*[:#-]?\s*(\d{4,8})\b/,
    /(?:N[Oº°]|NUMERO)\s+(?:DO\s+)?DOCUMENTO\s*[:#-]?\s*(\d{4,8})\b/,
  ])

  const meetingDate = firstMatch(text, [
    /DATA\s+(?:DA\s+)?REUNIAO\s*[:#-]?\s*(\d{2}[\/.\-]\d{2}[\/.\-]\d{2,4})/,
  ])

  const allDates = [...text.matchAll(/\b\d{2}[\/.\-]\d{2}[\/.\-]\d{2,4}\b/g)]
    .map((match) => match[0].replaceAll('.', '/').replaceAll('-', '/'))
  const uniqueDates = [...new Set(allDates)]
  const normalizedDate = meetingDate
    ? meetingDate.replaceAll('.', '/').replaceAll('-', '/')
    : uniqueDates.length === 1
      ? uniqueDates[0]
      : null

  return {
    kind,
    prontuario: prontuarioRaw ? normalizeProntuario(prontuarioRaw) : null,
    numeroDocumento: sequence,
    documentDate: normalizedDate,
    caseMode: null,
    isMonthly: /\bMENSAL\b/.test(text),
  }
}
