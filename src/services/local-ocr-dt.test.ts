import { afterEach, expect, it, vi } from 'vitest'
import type { AnalyzedDocument } from '../domain/document'

const mocks = vi.hoisted(() => ({
  canvas: { width: 1400, height: 2000 },
  recognize: vi.fn(async () => ({
    data: {
      text: 'Declaração de trânsito\nProntuário 42\nNº 010111',
      confidence: 99,
      blocks: [],
    },
  })),
}))

vi.mock('tesseract.js', () => ({
  OEM: { LSTM_ONLY: 1 },
  PSM: { AUTO: 3 },
  createWorker: async () => ({
    setParameters: vi.fn(),
    recognize: mocks.recognize,
    terminate: vi.fn(),
  }),
}))

vi.mock('./document-calibration', () => ({
  classifyKnownHeader: () => 'DECLARACAO_TRANSITO',
  detectDocumentOrientation: async () => ({
    canvas: mocks.canvas,
    rotation: 0,
    score: 10,
    headerText: 'Declaração de trânsito',
    certain: true,
  }),
  extractCalibratedFields: async () => ({
    prontuario: null,
    numeroDocumento: '010111',
    documentDate: '03/03/2026',
    fieldConfidence: { prontuario: 0, numeroDocumento: 99, documentDate: 99 },
  }),
  getProntuarioRegion: () => null,
  rotateCanvas: (canvas: unknown) => canvas,
  findLabeledProntuarioBox: () => null,
}))

vi.mock('./paddle-ocr', () => ({
  recognizeProntuarioWithPaddle: async () => ({ value: null, confidence: 0, available: true }),
}))

import { analyzeDocumentsWithLocalOcr } from './local-ocr'

afterEach(() => vi.unstubAllGlobals())

it('não usa prontuário truncado da leitura global como identidade de DT', async () => {
  const bitmap = { width: 1400, height: 2000, close: vi.fn() }
  vi.stubGlobal('createImageBitmap', async () => bitmap)
  vi.stubGlobal('document', {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({ fillRect() {}, drawImage() {} }),
    }),
  })

  const source: AnalyzedDocument = {
    id: 'dt',
    originalName: '004268-010111-FEDT_006.jpg',
    kind: null,
    prontuario: null,
    numeroDocumento: null,
    documentDate: null,
    caseMode: null,
    isMonthly: false,
    suggestedName: null,
    confidence: null,
    reviewStatus: 'PENDENTE',
    validations: [],
  }

  const directory = {
    getFileHandle: async () => ({
      getFile: async () => ({ name: source.originalName, type: 'image/jpeg', size: 10 }),
    }),
  }

  const [result] = await analyzeDocumentsWithLocalOcr(directory as never, [source])

  expect(result.kind).toBe('DECLARACAO_TRANSITO')
  expect(result.prontuario).toBeNull()
  expect(result.numeroDocumento).toBe('010111')
  expect(result.suggestedName).toBeNull()
  expect(result.reviewStatus).toBe('REVISAR')
})
