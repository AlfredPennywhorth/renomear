import { createWorker, OEM, PSM, type Worker } from 'tesseract.js'
import type { AnalyzedDocument } from '../domain/document'
import { suggestFileName } from './naming'
import { extractOcrFields } from './ocr-extraction'
import {
  classifyKnownHeader,
  detectDocumentOrientation,
  extractCalibratedFields,
  getProntuarioRegion,
  rotateCanvas,
  findLabeledProntuarioBox,
} from './document-calibration'
import { recognizeProntuarioWithPaddle } from './paddle-ocr'
import { mergeOcrMetadata } from './review-edit'
import { decideProntuario } from './prontuario-decision'
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
    const { GlobalWorkerOptions, getDocument } = await import('pdfjs-dist')
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

function score01(value: number | null | undefined, isPercent = false): number {
  if (value == null || !Number.isFinite(value)) return 0
  const score = isPercent ? value / 100 : value
  return Math.max(0, Math.min(1, score))
}

export async function analyzeDocumentsWithLocalOcr(
  directory: DirectoryHandleLike,
  documents: AnalyzedDocument[],
  onProgress?: (progress: OcrProgress) => void,
  options: { useCurrentOrientation?: boolean } = {},
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
        const oriented = options.useCurrentOrientation
          ? { canvas: rotateCanvas(input, current.rotationDegrees ?? 0), rotation: current.rotationDegrees ?? 0,
              score: 0, headerText: '', certain: true }
          : await detectDocumentOrientation(worker, input)

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
        const result = await worker.recognize(oriented.canvas, {}, { blocks: true })
        const confidence = Number.isFinite(result.data.confidence) ? result.data.confidence : 0
        const fields = extractOcrFields(result.data.text)
        const headerKind = classifyKnownHeader(oriented.headerText)
        const kind = current.kind ?? fields.kind ?? headerKind
        const calibrated = await extractCalibratedFields(worker, oriented.canvas, kind, result.data)
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

        let paddleValue: string | null = null
        let paddleConfidence = 0
        let paddleAvailable = true
        let paddleError: string | undefined

        if (current.prontuarioOcrSource !== 'MANUAL') {
          const prontuarioRegion = getProntuarioRegion(oriented.canvas, kind, result.data)
          if (prontuarioRegion) {
            onProgress?.({
              current: index + 1,
              total: documents.length,
              fileName: current.originalName,
              status: 'Conferindo prontuário com OCR local aprimorado',
            })
            const paddle = await recognizeProntuarioWithPaddle(prontuarioRegion)
            paddleValue = paddle.value
            paddleConfidence = score01(paddle.confidence)
            paddleAvailable = paddle.available
            paddleError = paddle.error
          }
        }

        const tesseractProntuario =
          calibrated.prontuario ??
          fields.prontuario ??
          (current.prontuarioOcrSource === 'MANUAL' ? current.prontuario : null)
        const tesseractConfidence = calibrated.prontuario
          ? score01(calibratedConfidence.prontuario, true)
          : 0

        const printedIdentityKind =
          kind === 'ENVELOPE' ||
          kind === 'RECIBO_ATENDIMENTO' ||
          kind === 'DECLARACAO_TRANSITO'
        const corroboratedProntuario =
          printedIdentityKind &&
          calibrated.prontuario &&
          fields.prontuario &&
          calibrated.prontuario === fields.prontuario
            ? calibrated.prontuario
            : null

        let identity = decideProntuario(
          current,
          tesseractProntuario ?? null,
          tesseractConfidence,
          paddleValue,
          paddleConfidence,
          corroboratedProntuario,
        )

        const ambiguousIdentity = findLabeledProntuarioBox(result.data) === 'AMBIGUOUS' && current.prontuarioOcrSource !== 'MANUAL'
        if (ambiguousIdentity) {
          identity = { value: null, confidence: null, source: null, conflict: false, lowConfidence: false }
        }

        const numeroDocumento = current.numeroDocumentoOcrSource === 'MANUAL'
          ? current.numeroDocumento
          : (
              preferCalibrated(
                calibrated.numeroDocumento,
                calibratedConfidence.numeroDocumento,
                fields.numeroDocumento,
              ) ?? null
            )
        const documentDate = preferCalibrated(
          calibrated.documentDate,
          calibratedConfidence.documentDate,
          fields.documentDate,
        ) ?? null

        const calibratedNeedsReview = [
          ...(current.numeroDocumentoOcrSource === 'MANUAL'
            ? []
            : [[calibrated.numeroDocumento, calibratedConfidence.numeroDocumento, fields.numeroDocumento]]),
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
          kind,
          prontuario: identity.value,
          prontuarioConfidence: identity.confidence,
          prontuarioOcrSource: identity.source,
          numeroDocumento,
          numeroDocumentoConfidence: current.numeroDocumentoOcrSource === 'MANUAL' && numeroDocumento
            ? 1
            : numeroDocumento && calibrated.numeroDocumento === numeroDocumento
              ? score01(calibratedConfidence.numeroDocumento, true)
              : null,
          numeroDocumentoOcrSource: current.numeroDocumentoOcrSource === 'MANUAL' && numeroDocumento
            ? 'MANUAL'
            : numeroDocumento && calibrated.numeroDocumento === numeroDocumento
              ? 'TESSERACT'
              : null,
          manualReviewApproved: false,
          ...mergeOcrMetadata(current, {
            documentDate,
            caseMode: calibrated.caseMode ?? fields.caseMode,
            isMonthly: fields.isMonthly,
          }),
          confidence: confidence / 100,
          rotationDegrees: isPdfDocument ? 0 : oriented.rotation,
          validations: current.validations.filter(
            (item) =>
              item.id !== 'ocr-empty-file' &&
              item.id !== 'ocr-confidence' &&
              item.id !== 'ocr-field-confidence' &&
              item.id !== 'ocr-error' &&
              item.id !== 'ocr-orientation-uncertain' &&
              item.id !== 'ocr-orientation' &&
              item.id !== 'ocr-orientation-pdf' &&
              item.id !== 'ocr-prontuario-ambiguous' &&
              item.id !== 'ocr-prontuario-conflict' &&
              item.id !== 'ocr-identity-confidence' &&
              item.id !== 'ocr-paddle-unavailable',
          ),
        }

        next.suggestedName = suggestFileName(next)
        if (next.suggestedName !== current.suggestedName || (next.rotationDegrees ?? 0) !== 0) {
          next.renameState = 'NAO_RENOMEADO'
          next.lastRenameError = null
        }

        if (!oriented.certain) {
          next.validations.push({
            id: 'ocr-orientation-uncertain',
            label: 'Orientação do arquivo',
            value: null,
            status: 'REVISAR',
            note: 'Não foi possível determinar a orientação com segurança nos quatro ângulos. Confira a imagem e os campos antes de aprovar.',
          })
          next.reviewStatus = 'REVISAR'
        }

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

        if (ambiguousIdentity) {
          next.validations.push({
            id: 'ocr-prontuario-ambiguous', label: 'Prontuário — múltiplos campos rotulados',
            value: null, status: 'REVISAR',
            note: 'Há mais de um campo Prontuário reconhecido. Nenhum recorte posicional pode resolver esta ambiguidade; confira e informe manualmente.',
          })
          next.reviewStatus = 'REVISAR'
        }

        if (identity.conflict) {
          next.validations = [
            ...next.validations,
            {
              id: 'ocr-prontuario-conflict',
              label: 'Prontuário — divergência entre leitores',
              value: null,
              status: 'REVISAR',
              note: 'Tesseract e PaddleOCR produziram prontuários diferentes. O sistema descartou ambos para evitar renomeação incorreta.',
            },
          ]
          next.reviewStatus = 'REVISAR'
        } else if (!identity.value && (identity.lowConfidence || kind !== null)) {
          next.validations = [
            ...next.validations,
            {
              id: 'ocr-identity-confidence',
              label: 'Confiança do prontuário',
              value: identity.confidence == null
                ? null
                : Math.round(identity.confidence * 100) + '%',
              status: 'REVISAR',
              note: 'Nenhuma leitura do prontuário atingiu o limiar seguro. Informe o número manualmente.',
            },
          ]
          next.reviewStatus = 'REVISAR'
        }

        if (!paddleAvailable && !identity.value) {
          next.validations = [
            ...next.validations,
            {
              id: 'ocr-paddle-unavailable',
              label: 'OCR local aprimorado',
              value: 'Indisponível',
              status: 'REVISAR',
              note: paddleError
                ? 'A segunda leitura local não pôde ser inicializada: ' + paddleError
                : 'A segunda leitura local não pôde ser inicializada.',
            },
          ]
          next.reviewStatus = 'REVISAR'
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

        if (confidence < OCR_MIN_CONFIDENCE || !kind) {
          next.validations = [
            ...next.validations,
            {
              id: 'ocr-confidence',
              label: 'Confiança da leitura automática',
              value: Math.round(confidence) + '%',
              status: 'REVISAR',
              note: !kind
                ? 'O tipo documental não foi classificado com segurança.'
                : 'A confiança global do texto ficou baixa; os identificadores usam confiança própria e segunda leitura quando disponível.',
            },
          ]
          next.reviewStatus = 'REVISAR'
        }

        analyzed.push(next)
      } catch (error) {
        analyzed.push({
          ...current,
          confidence: null,
          manualReviewApproved: false,
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
