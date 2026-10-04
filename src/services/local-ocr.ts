import { createWorker, OEM, PSM, type Worker } from 'tesseract.js'
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import type { AnalyzedDocument } from '../domain/document'
import { suggestFileName } from './naming'
import { extractOcrFields } from './ocr-extraction'
import { detectDocumentOrientation, extractCalibratedFields } from './document-calibration'
import type { DirectoryHandleLike } from './local-rename'

export type OcrProgress = {
  current: number
  total: number
  fileName: string
  status: string
  progress?: number
}

const OCR_MIN_CONFIDENCE = 72

function asset(path: string): string {
  const base = import.meta.env.BASE_URL || './'
  return base + path.replace(/^\//, '')
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  return canvas
}

async function fileToCanvas(file: File): Promise<HTMLCanvasElement> {
  if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
    GlobalWorkerOptions.workerSrc = asset('pdf/pdf.worker.min.mjs')
    const bytes = new Uint8Array(await file.arrayBuffer())
    const pdf = await getDocument({ data: bytes }).promise
    const page = await pdf.getPage(1)
    const viewport = page.getViewport({ scale: 2 })
    const canvas = createCanvas(viewport.width, viewport.height)
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) throw new Error('Não foi possível preparar o PDF para OCR.')
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvas, canvasContext: context, viewport }).promise
    return canvas
  }

  const bitmap = await createImageBitmap(file)
  try {
    const canvas = createCanvas(bitmap.width, bitmap.height)
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) throw new Error('Não foi possível preparar a imagem para OCR.')
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0)
    return canvas
  } finally {
    bitmap.close()
  }
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
        status: 'Detectando orientação',
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
        const oriented = await detectDocumentOrientation(worker, input)

        onProgress?.({
          current: index + 1,
          total: documents.length,
          fileName: current.originalName,
          status: oriented.rotation === 0
            ? 'Lendo documento'
            : 'Orientação corrigida em memória: ' + oriented.rotation + '°',
        })

        await worker.setParameters({
          tessedit_pageseg_mode: PSM.AUTO,
          preserve_interword_spaces: '1',
          tessedit_char_whitelist: '',
        })
        const result = await worker.recognize(oriented.canvas)
        const confidence = Number.isFinite(result.data.confidence) ? result.data.confidence : 0
        const fields = extractOcrFields(result.data.text)
        const calibrated = await extractCalibratedFields(worker, oriented.canvas, fields.kind)
        const calibratedConfidence = calibrated.fieldConfidence ?? {}

        const preferCalibrated = <T,>(
          value: T | null | undefined,
          valueConfidence: number | undefined,
          fallback: T | null | undefined,
        ): T | null | undefined => {
          if (value == null) return fallback
          if ((valueConfidence ?? 0) >= OCR_MIN_CONFIDENCE) return value
          if (fallback != null && String(fallback) === String(value)) return value
          return fallback
        }

        const calibratedNeedsReview = [
          [calibrated.prontuario, calibratedConfidence.prontuario, fields.prontuario],
          [calibrated.numeroDocumento, calibratedConfidence.numeroDocumento, fields.numeroDocumento],
          [calibrated.documentDate, calibratedConfidence.documentDate, fields.documentDate],
        ].some(([value, valueConfidence, fallback]) =>
          value != null &&
          Number(valueConfidence ?? 0) < OCR_MIN_CONFIDENCE &&
          (fallback == null || String(fallback) !== String(value)),
        )

        const isPdfDocument =
          file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

        const next: AnalyzedDocument = {
          ...current,
          kind: fields.kind ?? current.kind,
          prontuario: preferCalibrated(
            calibrated.prontuario,
            calibratedConfidence.prontuario,
            fields.prontuario ?? current.prontuario,
          ) ?? null,
          numeroDocumento: preferCalibrated(
            calibrated.numeroDocumento,
            calibratedConfidence.numeroDocumento,
            fields.numeroDocumento ?? current.numeroDocumento,
          ) ?? null,
          documentDate: preferCalibrated(
            calibrated.documentDate,
            calibratedConfidence.documentDate,
            fields.documentDate ?? current.documentDate,
          ) ?? null,
          caseMode: calibrated.caseMode ?? fields.caseMode ?? current.caseMode,
          isMonthly: fields.isMonthly || current.isMonthly,
          confidence: confidence / 100,
          rotationDegrees: isPdfDocument ? 0 : oriented.rotation,
          validations: current.validations.filter(
            (item) =>
              item.id !== 'ocr-confidence' &&
              item.id !== 'ocr-field-confidence' &&
              item.id !== 'ocr-error' &&
              item.id !== 'ocr-orientation' &&
              item.id !== 'ocr-orientation-pdf',
          ),
        }

        next.suggestedName = suggestFileName(next)

        if (oriented.rotation !== 0) {
          next.validations = [
            ...next.validations,
            {
              id: isPdfDocument ? 'ocr-orientation-pdf' : 'ocr-orientation',
              label: 'Orientação do arquivo',
              value: oriented.rotation + '°',
              status: isPdfDocument ? 'REVISAR' : 'OK',
              note: isPdfDocument
                ? 'A orientação foi corrigida somente para leitura. Esta versão não regrava a rotação física de PDFs.'
                : 'A orientação foi corrigida em memória para leitura e será aplicada quando a imagem for renomeada.',
            },
          ]
        }

        if (calibratedNeedsReview) {
          next.validations = [
            ...next.validations,
            {
              id: 'ocr-field-confidence',
              label: 'Confiança dos campos calibrados',
              value: null,
              status: 'REVISAR',
              note: 'Uma região calibrada produziu valor diferente ou isolado com baixa confiança. Confira os campos antes de aprovar.',
            },
          ]
          next.reviewStatus = 'REVISAR'
        }

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
          confidence: null,
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
