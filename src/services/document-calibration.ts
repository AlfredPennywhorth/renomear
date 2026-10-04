import { PSM, type Worker } from 'tesseract.js'
import type { AnalyzedDocument } from '../domain/document'
import { normalizeProntuario } from '../domain/prontuario'

export function scoreKnownHeader(text: string): number {
  const value = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()

  let score = 0
  if (value.includes('FICHA DE APRESENTACAO DE CASO')) score += 8
  if (value.includes('PEDIDO DE ROUPAS E DIVERSOS')) score += 8
  if (value.includes('CONGREGACAO CRISTA NO BRASIL')) score += 5
  if (value.includes('DECLARACAO DE TRANSITO')) score += 8
  if (value.includes('RECIBO DE ATENDIMENTO')) score += 7
  if (value.includes('PREENCHIDO NA REUNIAO')) score += 2
  return score
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
): Promise<{ canvas: HTMLCanvasElement; rotation: 0 | 90 | 180 | 270; score: number }> {
  const candidates: Array<0 | 90 | 180 | 270> =
    source.width >= source.height ? [0, 180] : [0, 90, 180, 270]

  let best = { canvas: source, rotation: 0 as 0 | 90 | 180 | 270, score: -1 }

  for (const rotation of candidates) {
    const canvas = rotateCanvas(source, rotation)
    const header = cropCanvas(canvas, 0, 0, 1, 0.22)
    const result = await recognize(worker, header, PSM.SPARSE_TEXT)
    const score = scoreKnownHeader(result.data.text)
    if (score > best.score) best = { canvas, rotation, score }
  }

  return best
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
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

export async function extractCalibratedFields(
  worker: Worker,
  canvas: HTMLCanvasElement,
  kind: AnalyzedDocument['kind'],
): Promise<Partial<AnalyzedDocument>> {
  if (kind === 'FICHA_C1') {
    const dateRegion = cropCanvas(canvas, 0.70, 0.105, 0.18, 0.09)
    const prontuarioRegion = cropCanvas(canvas, 0.87, 0.105, 0.13, 0.09)
    const dateResult = await recognize(worker, dateRegion, PSM.SINGLE_LINE, '0123456789/.-')
    const prontuarioResult = await recognize(worker, prontuarioRegion, PSM.SINGLE_LINE, '0123456789')
    const rawProntuario = digitsOnly(prontuarioResult.data.text)

    return {
      documentDate: dateFromText(dateResult.data.text),
      prontuario: rawProntuario.length >= 1 && rawProntuario.length <= 6
        ? normalizeProntuario(rawProntuario)
        : null,
      caseMode: detectC1CaseMode(canvas),
    }
  }

  if (kind === 'FICHA_C1_VERSO') {
    const region = cropCanvas(canvas, 0.80, 0, 0.20, 0.14)
    const result = await recognize(worker, region, PSM.SINGLE_LINE, '0123456789')
    const raw = digitsOnly(result.data.text)
    return {
      prontuario: raw.length >= 1 && raw.length <= 6 ? normalizeProntuario(raw) : null,
    }
  }

  if (kind === 'ENVELOPE' || kind === 'RECIBO_ATENDIMENTO') {
    // Modelo Obra da Piedade do lote 04/10/2026:
    // prontuário, data da reunião e sequência ficam empilhados no canto superior direito.
    const prontuarioRegion = cropCanvas(canvas, 0.84, 0.055, 0.16, 0.055)
    const dateRegion = cropCanvas(canvas, 0.84, 0.095, 0.16, 0.055)
    const sequenceRegion = cropCanvas(canvas, 0.84, 0.125, 0.16, 0.055)

    const [prontuarioResult, dateResult, sequenceResult] = await Promise.all([
      recognize(worker, prontuarioRegion, PSM.SINGLE_LINE, '0123456789'),
      recognize(worker, dateRegion, PSM.SINGLE_LINE, '0123456789/.-'),
      recognize(worker, sequenceRegion, PSM.SINGLE_LINE, '0123456789'),
    ])

    const rawProntuario = digitsOnly(prontuarioResult.data.text)
    const rawSequence = digitsOnly(sequenceResult.data.text)

    return {
      prontuario: rawProntuario.length >= 1 && rawProntuario.length <= 6
        ? normalizeProntuario(rawProntuario)
        : null,
      documentDate: dateFromText(dateResult.data.text),
      numeroDocumento: rawSequence.length >= 4 && rawSequence.length <= 8 ? rawSequence : null,
    }
  }

  if (kind === 'DECLARACAO_TRANSITO') {
    // Modelo Declaração de Trânsito do lote 04/10/2026:
    // número da DT e data ficam no quadro superior direito; prontuário na faixa Destinatário.
    const numeroRegion = cropCanvas(canvas, 0.69, 0.12, 0.27, 0.075)
    const dateRegion = cropCanvas(canvas, 0.72, 0.165, 0.22, 0.055)
    const prontuarioRegion = cropCanvas(canvas, 0.16, 0.255, 0.23, 0.06)

    const [numeroResult, dateResult, prontuarioResult] = await Promise.all([
      recognize(worker, numeroRegion, PSM.SINGLE_LINE, '0123456789'),
      recognize(worker, dateRegion, PSM.SINGLE_LINE, '0123456789/.-'),
      recognize(worker, prontuarioRegion, PSM.SINGLE_LINE, '0123456789'),
    ])

    const rawNumero = digitsOnly(numeroResult.data.text)
    const rawProntuario = digitsOnly(prontuarioResult.data.text)

    return {
      numeroDocumento: rawNumero.length >= 4 && rawNumero.length <= 8 ? rawNumero : null,
      documentDate: dateFromText(dateResult.data.text),
      prontuario: rawProntuario.length >= 1 && rawProntuario.length <= 6
        ? normalizeProntuario(rawProntuario)
        : null,
    }
  }

  return {}
}
