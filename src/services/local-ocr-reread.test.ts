import { afterEach, expect, it, vi } from 'vitest'
import type { AnalyzedDocument } from '../domain/document'

const mocks = vi.hoisted(() => ({
  recognize: vi.fn(async () => ({ data: { text: 'Declaração de trânsito Prontuário: 000999', confidence: 99 } })),
  orientation: vi.fn(),
  rotated: { width: 30, height: 20 },
  rotate: vi.fn(),
}))
vi.mock('tesseract.js', () => ({
  OEM: { LSTM_ONLY: 1 }, PSM: { AUTO: 3 },
  createWorker: async () => ({ setParameters: vi.fn(), recognize: mocks.recognize, terminate: vi.fn() }),
}))
vi.mock('./document-calibration', () => ({
  classifyKnownHeader: () => 'DECLARACAO_TRANSITO',
  detectDocumentOrientation: mocks.orientation,
  rotateCanvas: mocks.rotate,
  extractCalibratedFields: async () => ({ prontuario: '000999', numeroDocumento: '000888' }),
  getProntuarioRegion: () => null,
}))
import { analyzeDocumentsWithLocalOcr } from './local-ocr'

afterEach(() => vi.unstubAllGlobals())
it('relê no ângulo escolhido preservando identidade, sequência e data conferidas', async () => {
  mocks.rotate.mockReturnValue(mocks.rotated)
  const bitmap = { width: 20, height: 30, close: vi.fn() }
  vi.stubGlobal('createImageBitmap', async () => bitmap)
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ({ fillRect() {}, drawImage() {} }) }) })
  const source: AnalyzedDocument = {
    id: '1', originalName: 'scan.jpg', kind: 'DECLARACAO_TRANSITO',
    prontuario: '000123', prontuarioOcrSource: 'MANUAL', prontuarioConfidence: 1,
    numeroDocumento: '000456', numeroDocumentoOcrSource: 'MANUAL', numeroDocumentoConfidence: 1,
    documentDate: '01/01/2026', caseMode: null, isMonthly: false,
    suggestedName: '000123_000456_DT.jpg', confidence: 1, rotationDegrees: 90,
    reviewStatus: 'REVISAR', manualReviewApproved: false,
    validations: [{ id: 'manual-orientation-review', label: '', value: null, status: 'REVISAR' }],
  }
  const directory = { getFileHandle: async () => ({ getFile: async () => ({ name: 'scan.jpg', type: 'image/jpeg', size: 10 }) }) }
  const [result] = await analyzeDocumentsWithLocalOcr(directory as never, [source], undefined, { useCurrentOrientation: true })
  expect(mocks.orientation).not.toHaveBeenCalled()
  expect(mocks.rotate).toHaveBeenCalledWith(expect.anything(), 90)
  expect(mocks.recognize).toHaveBeenCalledWith(mocks.rotated, {}, { blocks: true })
  expect(result.prontuario).toBe('000123')
  expect(result.numeroDocumento).toBe('000456')
  expect(result.documentDate).toBe('01/01/2026')
  expect(result.manualReviewApproved).toBe(false)
  expect(result.validations.some(v => v.id === 'manual-orientation-review')).toBe(true)
})
