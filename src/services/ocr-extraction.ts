import type { AnalyzedDocument, DocumentKind, ExpectedGroup } from '../domain/document'
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

function classify(text: string, expectedGroup: ExpectedGroup): DocumentKind | null {
  const normalized = normalizeText(text)

  if (expectedGroup === 'C1') {
    if (normalized.includes('PEDIDO DE ROUPAS E DIVERSOS')) return 'FICHA_C1_VERSO'
    return 'FICHA_C1'
  }

  if (expectedGroup === 'ENVELOPE_RECIBO') {
    if (normalized.includes('RECIBO DE ATENDIMENTO') && normalized.includes('OBRA DA PIEDADE')) {
      return 'RECIBO_EMERGENCIA_MANUAL'
    }
    const hasMeetingDate = /DATA\s+(?:DA\s+)?REUNIAO/.test(normalized)
    const hasSequence = /SEQUENCIA|SEQ\.?/.test(normalized)
    if (hasMeetingDate && hasSequence) return 'ENVELOPE'
    
    // Fallback: if it's explicitly ENVELOPE_RECIBO and we can't tell which, 
    // we default to ENVELOPE or RECIBO based on basic keywords.
    if (normalized.includes('RECIBO')) return 'RECIBO_ATENDIMENTO'
    return 'ENVELOPE'
  }

  if (expectedGroup === 'DT') {
    return 'DECLARACAO_TRANSITO'
  }

  if (expectedGroup === 'DIVERSOS') {
    return 'NAO_PADRONIZADO'
  }

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

export function extractOcrFields(rawText: string, expectedGroup: ExpectedGroup = 'TODOS'): OcrFields {
  const text = normalizeText(rawText)
  const kind = classify(rawText, expectedGroup)

  const prontuarioRaw = firstMatch(text, [
    /PRONTUARIO\s*(?:N(?:O|º|°)\.?\s*)?[:#-]?\s*(\d{1,6})\b/,
    /PRONT\.?\s*(?:N(?:O|º|°)\.?\s*)?[:#-]?\s*(\d{1,6})\b/,
    // Relaxed fallback if we are sure it's a known group
    ...(expectedGroup !== 'TODOS' ? [/\b(?:PRO|PRON)[A-Z]*\s*(?:N(?:O|º|°)\.?\s*)?[:#-]?\s*(\d{1,6})\b/] : []),
  ])

  const sequenceRaw = firstMatch(text, [
    ...(kind === 'DECLARACAO_TRANSITO'
      ? [/\bN(?:O|º|°)?\s*[:#-]?\s*(\d{6})\b/]
      : []),
    /SEQUENCIA\s*[:#-]?\s*(\d{4,8})\b/,
    /SEQ\.?\s*[:#-]?\s*(\d{4,8})\b/,
    /(?:N[Oº°]|NUMERO)\s+(?:DO\s+)?DOCUMENTO\s*[:#-]?\s*(\d{4,8})\b/,
    // Relaxed fallback if we know it's envelope/recibo
    ...(expectedGroup === 'ENVELOPE_RECIBO' ? [/\bSEQ[A-Z]*\s*[:#-]?\s*(\d{4,8})\b/, /\b(?:N|NUM)\b.*\s+(\d{4,8})\b/] : []),
  ])

  let sequence = sequenceRaw
  if (sequence && sequence.length < 6) {
    if (kind === 'RECIBO_EMERGENCIA_MANUAL' || kind === 'NAO_PADRONIZADO' || expectedGroup === 'ENVELOPE_RECIBO') {
      sequence = sequence.padStart(6, '0')
    }
  } else if (sequence && sequence.length > 6) {
    // If it's more than 6 digits, we might want to flag it or just return it as is so validation catches it.
  }

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
