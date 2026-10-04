import { normalizeProntuario } from '../domain/prontuario'

const PADDLE_SDK_URL =
  'https://cdn.jsdelivr.net/npm/@paddleocr/paddleocr-js@0.4.2/+esm'
const ORT_WASM_URL =
  'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/'

type PaddleItem = {
  text?: unknown
  score?: unknown
}

type PaddleResult = {
  items?: PaddleItem[]
}

type PaddleEngine = {
  predict: (
    input: HTMLCanvasElement,
    params?: Record<string, unknown>,
  ) => Promise<PaddleResult[]>
  dispose?: () => void | Promise<void>
}

type PaddleModule = {
  PaddleOCR: {
    create: (options: Record<string, unknown>) => Promise<PaddleEngine>
  }
}

export type PaddleProntuarioResult = {
  value: string | null
  confidence: number | null
  rawText: string
  available: boolean
  error?: string
}

let enginePromise: Promise<PaddleEngine> | null = null

function normalizedScore(value: unknown): number {
  const score = typeof value === 'number' && Number.isFinite(value) ? value : 0
  if (score > 1) return Math.min(1, score / 100)
  return Math.max(0, Math.min(1, score))
}

async function loadEngine(): Promise<PaddleEngine> {
  if (!enginePromise) {
    enginePromise = (async () => {
      const module = await import(/* @vite-ignore */ PADDLE_SDK_URL) as PaddleModule
      return module.PaddleOCR.create({
        lang: 'pt',
        ocrVersion: 'PP-OCRv6',
        ortOptions: {
          backend: 'wasm',
          wasmPaths: ORT_WASM_URL,
          numThreads: 1,
          simd: true,
        },
        textDetectionBatchSize: 1,
        textRecognitionBatchSize: 2,
      })
    })().catch((error) => {
      enginePromise = null
      throw error
    })
  }

  return enginePromise
}

function numericCandidate(item: PaddleItem): {
  value: string
  confidence: number
  rawText: string
} | null {
  const rawText = typeof item.text === 'string' ? item.text.trim() : ''
  if (!rawText) return null

  const compact = rawText.replace(/\s/g, '')
  if (!/^[0-9.,:/_-]+$/.test(compact)) return null

  const digits = compact.replace(/\D/g, '')
  if (digits.length < 1 || digits.length > 6) return null

  const value = normalizeProntuario(digits)
  if (!value) return null

  return {
    value,
    confidence: normalizedScore(item.score),
    rawText,
  }
}

export async function recognizeProntuarioWithPaddle(
  canvas: HTMLCanvasElement,
): Promise<PaddleProntuarioResult> {
  try {
    const engine = await loadEngine()
    const [result] = await engine.predict(canvas, {
      textRecScoreThresh: 0.2,
      textDetBoxThresh: 0.25,
      textDetThresh: 0.2,
    })

    const items = result?.items ?? []
    const candidates = items
      .map(numericCandidate)
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.confidence - a.confidence)

    const best = candidates[0]
    return {
      value: best?.value ?? null,
      confidence: best?.confidence ?? null,
      rawText: items
        .map((item) => typeof item.text === 'string' ? item.text : '')
        .filter(Boolean)
        .join(' | '),
      available: true,
    }
  } catch (error) {
    return {
      value: null,
      confidence: null,
      rawText: '',
      available: false,
      error: error instanceof Error ? error.message : 'PaddleOCR local indisponível.',
    }
  }
}
