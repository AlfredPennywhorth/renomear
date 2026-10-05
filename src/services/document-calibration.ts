import { PSM, type Worker } from 'tesseract.js'
import type { AnalyzedDocument, DocumentKind } from '../domain/document'
import { normalizeProntuario } from '../domain/prontuario'

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

export function scoreKnownHeader(text: string): number {
  const value = normalizeText(text)

  let score = 0
  if (value.includes('FICHA DE APRESENTACAO DE CASO')) score += 8
  if (value.includes('PEDIDO DE ROUPAS E DIVERSOS')) score += 8
  if (value.includes('CONGREGACAO CRISTA NO BRASIL')) score += 5
  if (value.includes('DECLARACAO DE TRANSITO')) score += 8
  if (value.includes('RECIBO DE ATENDIMENTO')) score += 7
  if (value.includes('PREENCHIDO NA REUNIAO')) score += 2
  if (value.includes('DATA DA REUNIAO')) score += 2
  if (value.includes('SEQUENCIA')) score += 1
  return score
}

export function classifyKnownHeader(text: string): DocumentKind | null {
  const value = normalizeText(text)

  if (value.includes('FICHA DE APRESENTACAO DE CASO')) return 'FICHA_C1'
  if (value.includes('PEDIDO DE ROUPAS E DIVERSOS')) return 'FICHA_C1_VERSO'
  if (value.includes('DECLARACAO DE TRANSITO')) return 'DECLARACAO_TRANSITO'
  if (value.includes('RECIBO DE ATENDIMENTO') && value.includes('OBRA DA PIEDADE')) {
    return 'RECIBO_EMERGENCIA_MANUAL'
  }
  if (
    value.includes('OBRA DA PIEDADE') &&
    (
      value.includes('PREENCHIDO NA REUNIAO') ||
      value.includes('DATA DA REUNIAO') ||
      value.includes('SEQUENCIA')
    )
  ) {
    return 'ENVELOPE'
  }

  return null
}

function newCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  return canvas
}

export function rotateCanvas(
  source: HTMLCanvasElement,
  degrees: 0 | 90 | 180 | 270,
): HTMLCanvasElement {
  if (degrees === 0) return source
  const swap = degrees === 90 || degrees === 270
  const output = newCanvas(swap ? source.height : source.width, swap ? source.width : source.height)
  const context = output.getContext('2d', { alpha: false })
  if (!context) throw new Error('Não foi possível corrigir a orientação da imagem.')

  context.fillStyle = '#fff'
  context.fillRect(0, 0, output.width, output.height)
  context.translate(output.width / 2, output.height / 2)
  context.rotate((degrees * Math.PI) / 180)
  context.drawImage(source, -source.width / 2, -source.height / 2)
  return output
}

export function cropCanvas(
  source: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
): HTMLCanvasElement {
  const sx = Math.max(0, Math.floor(source.width * x))
  const sy = Math.max(0, Math.floor(source.height * y))
  const sw = Math.max(1, Math.min(source.width - sx, Math.floor(source.width * width)))
  const sh = Math.max(1, Math.min(source.height - sy, Math.floor(source.height * height)))
  const output = newCanvas(sw, sh)
  const context = output.getContext('2d', { alpha: false })
  if (!context) throw new Error('Não foi possível preparar a região para OCR.')
  context.fillStyle = '#fff'
  context.fillRect(0, 0, sw, sh)
  context.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh)
  return output
}

export function prepareNumericRegion(source: HTMLCanvasElement): HTMLCanvasElement {
  const scale = 3
  const output = newCanvas(source.width * scale, source.height * scale)
  const context = output.getContext('2d', { alpha: false, willReadFrequently: true })
  if (!context) throw new Error('Não foi possível preparar o campo numérico para OCR.')

  context.fillStyle = '#fff'
  context.fillRect(0, 0, output.width, output.height)
  context.imageSmoothingEnabled = true
  context.drawImage(source, 0, 0, output.width, output.height)

  const image = context.getImageData(0, 0, output.width, output.height)
  for (let index = 0; index < image.data.length; index += 4) {
    const red = image.data[index]
    const green = image.data[index + 1]
    const blue = image.data[index + 2]
    const gray = Math.round((red * 0.299) + (green * 0.587) + (blue * 0.114))
    const contrasted = gray >= 220
      ? 255
      : gray <= 145
        ? 0
        : Math.round(((gray - 145) / 75) * 255)
    image.data[index] = contrasted
    image.data[index + 1] = contrasted
    image.data[index + 2] = contrasted
    image.data[index + 3] = 255
  }
  context.putImageData(image, 0, 0)

  return output
}

export function getProntuarioRegion(
  canvas: HTMLCanvasElement,
  kind: AnalyzedDocument['kind'],
): HTMLCanvasElement | null {
  if (kind === 'FICHA_C1') {
    return prepareNumericRegion(cropCanvas(canvas, 0.865, 0.105, 0.135, 0.055))
  }
  if (kind === 'FICHA_C1_VERSO') {
    return prepareNumericRegion(cropCanvas(canvas, 0.80, 0, 0.20, 0.11))
  }
  if (kind === 'ENVELOPE' || kind === 'RECIBO_ATENDIMENTO') {
    return prepareNumericRegion(cropCanvas(canvas, 0.84, 0.055, 0.16, 0.055))
  }
  if (kind === 'DECLARACAO_TRANSITO') {
    return prepareNumericRegion(cropCanvas(canvas, 0.16, 0.255, 0.23, 0.06))
  }
  return null
}

async function recognize(
  worker: Worker,
  canvas: HTMLCanvasElement,
  psm: PSM,
  whitelist = '',
) {
  await worker.setParameters({
    tessedit_pageseg_mode: psm,
    preserve_interword_spaces: '1',
    tessedit_char_whitelist: whitelist,
  })
  return worker.recognize(canvas)
}

export async function detectDocumentOrientation(
  worker: Worker,
  source: HTMLCanvasElement,
): Promise<{
  canvas: HTMLCanvasElement
  rotation: 0 | 90 | 180 | 270
  score: number
  headerText: string
}> {
  const candidates: Array<0 | 90 | 180 | 270> = [0, 90, 180, 270]

  let best = {
    canvas: source,
    rotation: 0 as 0 | 90 | 180 | 270,
    score: -1,
    headerText: '',
  }

  for (const rotation of candidates) {
    const canvas = rotateCanvas(source, rotation)
    const header = cropCanvas(canvas, 0, 0, 1, 0.22)
    const result = await recognize(worker, header, PSM.SPARSE_TEXT)
    const headerText = result.data.text
    const score = scoreKnownHeader(headerText)
    if (score > best.score) best = { canvas, rotation, score, headerText }
  }

  return best
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

function sixDigitCandidateFromRecognition(result: {
  data: {
    text: string
    confidence: number
    words?: Array<{ text: string; confidence: number }>
  }
}): { value: string | null; confidence: number } {
  const word = result.data.words?.find((item) => /^\d{6}$/.test(item.text.replace(/\D/g, '')))
  if (word) {
    return {
      value: word.text.replace(/\D/g, ''),
      confidence: word.confidence,
    }
  }

  const match = result.data.text.match(/(?:^|\D)(\d{6})(?:\D|$)/)
  return {
    value: match?.[1] ?? null,
    confidence: match ? result.data.confidence : 0,
  }
}

function dateFromText(value: string): string | null {
  const match = value.match(/(\d{1,2})\D+(\d{1,2})\D+(\d{2,4})/)
  if (!match) return null
  const day = match[1].padStart(2, '0')
  const month = match[2].padStart(2, '0')
  const year = match[3].length === 2 ? '20' + match[3] : match[3]
  return day + '/' + month + '/' + year
}

function darkness(
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
): number {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return 0
  const sx = Math.floor(canvas.width * x)
  const sy = Math.floor(canvas.height * y)
  const sw = Math.max(2, Math.floor(canvas.width * width))
  const sh = Math.max(2, Math.floor(canvas.height * height))
  const data = context.getImageData(sx, sy, sw, sh).data
  let dark = 0
  for (let index = 0; index < data.length; index += 4) {
    const gray = (data[index] + data[index + 1] + data[index + 2]) / 3
    if (gray < 110) dark += 1
  }
  return dark / (data.length / 4)
}

function detectC1CaseMode(canvas: HTMLCanvasElement): AnalyzedDocument['caseMode'] {
  const meeting = darkness(canvas, 0.023, 0.119, 0.018, 0.024)
  const emergency = darkness(canvas, 0.023, 0.146, 0.018, 0.024)
  if (Math.abs(meeting - emergency) < 0.025) return null
  return meeting > emergency ? 'REUNIAO' : 'EMERGENCIA'
}

export type CalibratedFields = Partial<AnalyzedDocument> & {
  fieldConfidence?: {
    prontuario?: number
    numeroDocumento?: number
    documentDate?: number
  }
}

export async function extractCalibratedFields(
  worker: Worker,
  canvas: HTMLCanvasElement,
  kind: AnalyzedDocument['kind'],
): Promise<CalibratedFields> {
  if (kind === 'FICHA_C1') {
    const dateRegion = prepareNumericRegion(cropCanvas(canvas, 0.70, 0.105, 0.18, 0.055))
    const prontuarioRegion = getProntuarioRegion(canvas, kind)
    if (!prontuarioRegion) return {}

    const dateResult = await recognize(worker, dateRegion, PSM.SINGLE_LINE, '0123456789/.-')
    const prontuarioResult = await recognize(worker, prontuarioRegion, PSM.SINGLE_LINE, '0123456789')
    const rawProntuario = digitsOnly(prontuarioResult.data.text)

    return {
      documentDate: dateFromText(dateResult.data.text),
      prontuario: rawProntuario.length >= 1 && rawProntuario.length <= 6
        ? normalizeProntuario(rawProntuario)
        : null,
      caseMode: detectC1CaseMode(canvas),
      fieldConfidence: {
        prontuario: prontuarioResult.data.confidence,
        documentDate: dateResult.data.confidence,
      },
    }
  }

  if (kind === 'FICHA_C1_VERSO') {
    const region = getProntuarioRegion(canvas, kind)
    if (!region) return {}
    const result = await recognize(worker, region, PSM.SINGLE_LINE, '0123456789')
    const raw = digitsOnly(result.data.text)
    return {
      prontuario: raw.length >= 1 && raw.length <= 6 ? normalizeProntuario(raw) : null,
      fieldConfidence: { prontuario: result.data.confidence },
    }
  }

  if (kind === 'ENVELOPE' || kind === 'RECIBO_ATENDIMENTO') {
    const prontuarioRegion = getProntuarioRegion(canvas, kind)
    if (!prontuarioRegion) return {}
    const dateRegion = prepareNumericRegion(cropCanvas(canvas, 0.84, 0.095, 0.16, 0.05))
    const sequenceRegion = prepareNumericRegion(cropCanvas(canvas, 0.84, 0.125, 0.16, 0.05))

    const prontuarioResult = await recognize(worker, prontuarioRegion, PSM.SINGLE_LINE, '0123456789')
    const dateResult = await recognize(worker, dateRegion, PSM.SINGLE_LINE, '0123456789/.-')
    const sequenceResult = await recognize(worker, sequenceRegion, PSM.SINGLE_LINE, '0123456789')

    const rawProntuario = digitsOnly(prontuarioResult.data.text)
    const rawSequence = digitsOnly(sequenceResult.data.text)

    return {
      prontuario: rawProntuario.length >= 1 && rawProntuario.length <= 6
        ? normalizeProntuario(rawProntuario)
        : null,
      documentDate: dateFromText(dateResult.data.text),
      numeroDocumento: rawSequence.length >= 4 && rawSequence.length <= 8 ? rawSequence : null,
      fieldConfidence: {
        prontuario: prontuarioResult.data.confidence,
        documentDate: dateResult.data.confidence,
        numeroDocumento: sequenceResult.data.confidence,
      },
    }
  }

  if (kind === 'DECLARACAO_TRANSITO') {
    const numeroRegion = prepareNumericRegion(cropCanvas(canvas, 0.69, 0.12, 0.27, 0.075))
    const dateRegion = prepareNumericRegion(cropCanvas(canvas, 0.72, 0.165, 0.22, 0.055))
    const prontuarioRegion = getProntuarioRegion(canvas, kind)
    if (!prontuarioRegion) return {}

    const numeroResult = await recognize(worker, numeroRegion, PSM.SPARSE_TEXT, '0123456789')
    const dateResult = await recognize(worker, dateRegion, PSM.SINGLE_LINE, '0123456789/.-')
    const prontuarioResult = await recognize(worker, prontuarioRegion, PSM.SINGLE_LINE, '0123456789')

    const numeroCandidate = sixDigitCandidateFromRecognition(numeroResult)
    const rawProntuario = digitsOnly(prontuarioResult.data.text)

    return {
      numeroDocumento: numeroCandidate.value,
      documentDate: dateFromText(dateResult.data.text),
      prontuario: rawProntuario.length >= 1 && rawProntuario.length <= 6
        ? normalizeProntuario(rawProntuario)
        : null,
      fieldConfidence: {
        prontuario: prontuarioResult.data.confidence,
        documentDate: dateResult.data.confidence,
        numeroDocumento: numeroCandidate.confidence,
      },
    }
  }

  return {}
}
