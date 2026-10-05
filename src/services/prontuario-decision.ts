import type { AnalyzedDocument } from '../domain/document'
import { normalizeProntuario } from '../domain/prontuario'

export type IdentityDecision = {
  value: string | null
  confidence: number | null
  source: AnalyzedDocument['prontuarioOcrSource']
  conflict: boolean
  lowConfidence: boolean
}

export function decideProntuario(
  current: AnalyzedDocument,
  tesseractValue: string | null,
  tesseractConfidence: number,
  paddleValue: string | null,
  paddleConfidence: number,
  corroboratedValue: string | null = null,
): IdentityDecision {
  if (
    current.prontuarioOcrSource === 'MANUAL' &&
    current.prontuario &&
    normalizeProntuario(current.prontuario)
  ) {
    return {
      value: normalizeProntuario(current.prontuario),
      confidence: 1,
      source: 'MANUAL',
      conflict: false,
      lowConfidence: false,
    }
  }

  if (
    corroboratedValue &&
    tesseractValue &&
    corroboratedValue === tesseractValue
  ) {
    return {
      value: corroboratedValue,
      confidence: 0.9,
      source: 'CONSENSUS',
      conflict: false,
      lowConfidence: false,
    }
  }

  if (tesseractValue && paddleValue) {
    if (tesseractValue !== paddleValue) {
      return {
        value: null,
        confidence: Math.max(tesseractConfidence, paddleConfidence),
        source: null,
        conflict: true,
        lowConfidence: false,
      }
    }

    if (tesseractConfidence >= 0.55 && paddleConfidence >= 0.55) {
      return {
        value: tesseractValue,
        confidence: Math.max(tesseractConfidence, paddleConfidence),
        source: 'CONSENSUS',
        conflict: false,
        lowConfidence: false,
      }
    }
  }

  if (paddleValue && paddleConfidence >= 0.84) {
    return {
      value: paddleValue,
      confidence: paddleConfidence,
      source: 'PADDLE',
      conflict: false,
      lowConfidence: false,
    }
  }

  if (tesseractValue && tesseractConfidence >= 0.88) {
    return {
      value: tesseractValue,
      confidence: tesseractConfidence,
      source: 'TESSERACT',
      conflict: false,
      lowConfidence: false,
    }
  }

  return {
    value: null,
    confidence: Math.max(tesseractConfidence, paddleConfidence) || null,
    source: null,
    conflict: false,
    lowConfidence: Boolean(tesseractValue || paddleValue),
  }
}
