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
    .replace(/[\r\n]+/g, ' ')
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
    /PRONTUARIO\s*(?:N(?:O|º|°)\.?\s*)?[:#-]?\s*([0-9OIL \t]{1,10})\b/,
    /PRONT\.?\s*(?:N(?:O|º|°)\.?\s*)?[:#-]?\s*([0-9OIL \t]{1,10})\b/,
    // Relaxed fallback if we are sure it's a known group
    ...(expectedGroup !== 'TODOS' ? [/\b(?:PRO|PRON)[A-Z]*\s*(?:N(?:O|º|°)\.?\s*)?[:#-]?\s*([0-9OIL \t]{1,10})\b/] : []),
  ])

  const sequenceRaw = firstMatch(text, [
    ...(kind === 'DECLARACAO_TRANSITO'
      ? [/(?:^|\W|\d)N(?:O|º|°|P)?\s*[:#-]?\s*([0-9OIL \t]{6,10})\b/]
      : []),
    /SEQUENCIA\s*[:#-]?\s*([0-9OIL \t]{4,10})\b/,
    /SEQ\.?\s*[:#-]?\s*([0-9OIL \t]{4,10})\b/,
    /(?:N[Oº°]|NUMERO)\s+(?:DO\s+)?DOCUMENTO\s*[:#-]?\s*([0-9OIL \t]{4,10})\b/,
    // Relaxed fallback if we know it's envelope/recibo
    ...(expectedGroup === 'ENVELOPE_RECIBO' ? [/\bSEQ[A-Z]*\s*[:#-]?\s*([0-9OIL \t]{4,10})\b/, /\b(?:N|NUM)\b.*\s+([0-9OIL \t]{4,10})\b/] : []),
  ])

  const fixOcrTypos = (val: string | null) => {
    if (!val) return null
    const cleaned = val.replace(/\s+/g, '').replace(/O/g, '0').replace(/[IL]/g, '1')
    return cleaned.length > 0 ? cleaned : null
  }

  const cleanProntuarioRaw = fixOcrTypos(prontuarioRaw)
  const cleanSequenceRaw = fixOcrTypos(sequenceRaw)

  let sequence = cleanSequenceRaw
  // Se a sequência limpa tiver menos de 4 dígitos (ex: o OCR leu "0        "), é um falso positivo do regex
  if (sequence && sequence.length < 4) {
    sequence = null
  }

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
