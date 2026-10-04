import { createWorker, OEM, PSM, type Worker } from 'tesseract.js'
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import type { AnalyzedDocument, DocumentKind } from '../domain/document'
import { normalizeProntuario } from '../domain/prontuario'
import { suggestFileName } from './naming'
import type { DirectoryHandleLike } from './local-rename'

export type OcrProgress = {
  current: number
  total: number
  fileName: string
  status: string
  progress?: number
}

type OcrFields = {
  kind: DocumentKind | null
  prontuario: string | null
  numeroDocumento: string | null
  documentDate: string | null
  caseMode: AnalyzedDocument['caseMode']
  isMonthly: boolean
}

const OCR_MIN_CONFIDENCE = 82

function asset(path: string): string {
  const base = import.meta.env.BASE_URL || './'
  return base + path.replace(/^\//, '')
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

  // Envelope/recibo impresso: só classifica quando houver sinais simultâneos
  // para evitar que números soltos provoquem uma classificação indevida.
  const hasMeetingDate = /DATA\s+(?:DA\s+)?REUNIAO/.test(normalized)
  const hasSequence = /SEQUENCIA|SEQ\.?/.test(normalized)
  if (hasMeetingDate && hasSequence) return 'ENVELOPE'

  return null
}

function extractFields(rawText: string): OcrFields {
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

  const anyDate = firstMatch(text, [
    /\b(\d{2}[\/.\-]\d{2}[\/.\-]\d{4})\b/,
    /\b(\d{2}[\/.\-]\d{2}[\/.\-]\d{2})\b/,
  ])

  const normalizedDate = (meetingDate ?? anyDate)?.replaceAll('.', '/').replaceAll('-', '/') ?? null

  return {
    kind,
    prontuario: prontuarioRaw ? normalizeProntuario(prontuarioRaw) : null,
    numeroDocumento: sequence,
    documentDate: normalizedDate,
    caseMode:
      /\bEMERGENCIA\b/.test(text)
        ? 'EMERGENCIA'
        : /\bREUNIAO\b/.test(text)
          ? 'REUNIAO'
          : null,
    isMonthly: /\bMENSAL\b/.test(text),
  }
}

async function fileToCanvas(file: File): Promise<HTMLCanvasElement | File> {
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    return file
  }

  GlobalWorkerOptions.workerSrc = asset('pdf/pdf.worker.min.mjs')
  const bytes = new Uint8Array(await file.arrayBuffer())
  const pdf = await getDocument({ data: bytes }).promise
  const page = await pdf.getPage(1)
  const viewport = page.getViewport({ scale: 2 })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  const context = canvas.getContext('2d', { alpha: false })

  if (!context) throw new Error('Não foi possível preparar o PDF para OCR.')

  await page.render({ canvas, canvasContext: context, viewport }).promise
  return canvas
}

async function createLocalWorker(
  onProgress?: (status: string, progress?: number) => void,
): Promise<Worker> {
  const worker = await createWorker('por', OEM.LSTM_ONLY, {
    workerPath: asset('ocr/worker.min.js'),
    corePath: asset('ocr/core'),
    langPath: asset('ocr/lang'),
    cacheMethod: 'none',
    logger: (message) => {
      onProgress?.(message.status, typeof message.progress === 'number' ? message.progress : undefined)
    },
  })

  await worker.setParameters({
    tessedit_pageseg_mode: PSM.AUTO,
    preserve_interword_spaces: '1',
  })

  return worker
}

export async function analyzeDocumentsWithLocalOcr(
  directory: DirectoryHandleLike,
  documents: AnalyzedDocument[],
  onProgress?: (progress: OcrProgress) => void,
): Promise<AnalyzedDocument[]> {
  if (documents.length === 0) return []

  let worker: Worker | null = null
  let activeIndex = 0
  let activeName = documents[0]?.originalName ?? ''

  try {
    worker = await createLocalWorker((status, progress) => {
      onProgress?.({
        current: activeIndex + 1,
        total: documents.length,
        fileName: activeName,
        status,
        progress,
      })
    })

    const analyzed: AnalyzedDocument[] = []

    for (let index = 0; index < documents.length; index += 1) {
      const current = documents[index]
      activeIndex = index
      activeName = current.originalName

      onProgress?.({
        current: index + 1,
        total: documents.length,
        fileName: current.originalName,
        status: 'Preparando documento',
      })

      try {
        const handle = await directory.getFileHandle(current.originalName)
        const file = await handle.getFile()

        if (file.size === 0) {
          analyzed.push({
            ...current,
            reviewStatus: 'REVISAR',
            validations: [
              ...current.validations,
              {
                id: 'ocr-empty-file',
                label: 'Leitura automática',
                value: null,
                status: 'REVISAR',
                note: 'Arquivo vazio. Redigitalize ou substitua o arquivo.',
              },
            ],
          })
          continue
        }

        const input = await fileToCanvas(file)
        const result = await worker.recognize(input, { rotateAuto: true })
        const confidence = Number.isFinite(result.data.confidence) ? result.data.confidence : 0
        const fields = extractFields(result.data.text)

        const next: AnalyzedDocument = {
          ...current,
          kind: fields.kind ?? current.kind,
          prontuario: fields.prontuario ?? current.prontuario,
          numeroDocumento: fields.numeroDocumento ?? current.numeroDocumento,
          documentDate: fields.documentDate ?? current.documentDate,
          caseMode: fields.caseMode ?? current.caseMode,
          isMonthly: fields.isMonthly || current.isMonthly,
          confidence: confidence / 100,
          validations: current.validations.filter((item) => item.id !== 'ocr-confidence'),
        }

        next.suggestedName = suggestFileName(next)

        if (confidence < OCR_MIN_CONFIDENCE || !fields.kind) {
          next.validations = [
            ...next.validations,
            {
              id: 'ocr-confidence',
              label: 'Confiança da leitura automática',
              value: Math.round(confidence) + '%',
              status: 'REVISAR',
              note: !fields.kind
                ? 'O tipo documental não foi classificado com segurança.'
                : 'A confiança global do OCR ficou abaixo do limiar automático.',
            },
          ]
          next.reviewStatus = 'REVISAR'
        }

        analyzed.push(next)
      } catch (error) {
        analyzed.push({
          ...current,
          reviewStatus: 'REVISAR',
          validations: [
            ...current.validations.filter((item) => item.id !== 'ocr-error'),
            {
              id: 'ocr-error',
              label: 'Leitura automática',
              value: null,
              status: 'REVISAR',
              note: error instanceof Error ? error.message : 'Falha não identificada durante o OCR local.',
            },
          ],
        })
      }
    }

    return analyzed
  } finally {
    await worker?.terminate()
  }
}
