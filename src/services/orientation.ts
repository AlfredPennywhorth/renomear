export type Orientation = 0 | 90 | 180 | 270

export type OrientationScore = {
  orientation: Orientation
  confidence: number
}

export type ReadabilityDecision =
  | {
      status: 'OK'
      orientation: Orientation
      confidence: number
      autoCorrected: boolean
      message: string
    }
  | {
      status: 'REJEITADO'
      orientation: null
      confidence: number
      autoCorrected: false
      message: string
    }

export const REJECTION_MESSAGE =
  'Documento fora do padrão de leitura. Redigitalize o documento em posição correta, completo, legível e sem cortes.'

export function chooseReadableOrientation(
  scores: OrientationScore[],
  minimumConfidence = 0.75,
): ReadabilityDecision {
  if (scores.length === 0) {
    return {
      status: 'REJEITADO',
      orientation: null,
      confidence: 0,
      autoCorrected: false,
      message: REJECTION_MESSAGE,
    }
  }

  const best = [...scores].sort((a, b) => b.confidence - a.confidence)[0]

  if (best.confidence < minimumConfidence) {
    return {
      status: 'REJEITADO',
      orientation: null,
      confidence: best.confidence,
      autoCorrected: false,
      message: REJECTION_MESSAGE,
    }
  }

  return {
    status: 'OK',
    orientation: best.orientation,
    confidence: best.confidence,
    autoCorrected: best.orientation !== 0,
    message:
      best.orientation === 0
        ? 'Documento reconhecido na orientação original.'
        : 'Orientação ajustada automaticamente para leitura.',
  }
}
