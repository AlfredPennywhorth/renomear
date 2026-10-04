import { describe, expect, it } from 'vitest'
import type { AnalyzedDocument } from '../domain/document'
import { renameApprovedDocuments, rotationOutputMime, type DirectoryHandleLike } from './local-rename'

function makeDocument(overrides: Partial<AnalyzedDocument> = {}): AnalyzedDocument {
  return {
    id: '1',
    originalName: 'origem.jpg',
    kind: 'FICHA_C1',
    prontuario: '001234',
    numeroDocumento: null,
    documentDate: '01/01/2026',
    caseMode: 'REUNIAO',
    isMonthly: false,
    suggestedName: '001234_c1_frente.jpg',
    confidence: null,
    reviewStatus: 'OK',
    validations: [],
    ...overrides,
  }
}

function makeFile(name: string, bytes: Uint8Array): File {
  const copy = Uint8Array.from(bytes)
  return {
    name,
    size: copy.byteLength,
    arrayBuffer: async () => copy.buffer.slice(0) as ArrayBuffer,
  } as unknown as File
}

function fakeDirectory(initial: Record<string, Uint8Array>, corruptWrites = false) {
  const files = new Map<string, Uint8Array>(
    Object.entries(initial).map(([name, value]) => [name, new Uint8Array(value)]),
  )
  const removed: string[] = []

  const directory: DirectoryHandleLike = {
    name: 'teste',
    values: async function* () {
      for (const name of files.keys()) yield { kind: 'file', name }
    },
    queryPermission: async () => 'granted',
    requestPermission: async () => 'granted',
    getFileHandle: async (name, options) => {
      if (!files.has(name)) {
        if (!options?.create) throw new DOMException('Não encontrado', 'NotFoundError')
        files.set(name, new Uint8Array())
      }

      let handleName = name
      return {
        getFile: async () => makeFile(handleName, files.get(handleName) ?? new Uint8Array()),
        createWritable: async () => ({
          write: async (data: Blob) => {
            const source = new Uint8Array(await data.arrayBuffer())
            files.set(handleName, corruptWrites ? new Uint8Array([9, 9, 9]) : source)
          },
          close: async () => {},
          abort: async () => {},
        }),
        move: async (target: string) => {
          if (files.has(target)) throw new DOMException('Destino já existe', 'InvalidModificationError')
          const current = files.get(handleName)
          if (!current) throw new DOMException('Não encontrado', 'NotFoundError')
          files.set(target, current)
          files.delete(handleName)
          handleName = target
        },
      }
    },
    removeEntry: async (name) => {
      if (!files.has(name)) throw new DOMException('Não encontrado', 'NotFoundError')
      files.delete(name)
      removed.push(name)
    },
  }

  return { directory, files, removed }
}

describe('rotationOutputMime', () => {
  it('preserva WebP mesmo quando File.type está vazio', () => {
    expect(rotationOutputMime({ name: 'scan.webp', type: '' })).toBe('image/webp')
  })

  it('preserva PNG e usa JPEG para JPG', () => {
    expect(rotationOutputMime({ name: 'scan.png', type: 'image/png' })).toBe('image/png')
    expect(rotationOutputMime({ name: 'scan.jpg', type: 'image/jpeg' })).toBe('image/jpeg')
  })
})

describe('renameApprovedDocuments', () => {
  it('só remove o original depois de verificar a integridade da cópia', async () => {
    const original = new Uint8Array([1, 2, 3, 4])
    const { directory, files, removed } = fakeDirectory({ 'origem.jpg': original })

    const [result] = await renameApprovedDocuments(directory, [makeDocument()])

    expect(result.status).toBe('RENOMEADO')
    expect(files.has('origem.jpg')).toBe(false)
    expect([...files.get('001234_c1_frente.jpg')!]).toEqual([...original])
    expect(removed).toEqual(['origem.jpg'])
  })

  it('preserva o original quando a cópia falha na verificação de integridade', async () => {
    const original = new Uint8Array([1, 2, 3, 4])
    const { directory, files, removed } = fakeDirectory({ 'origem.jpg': original }, true)

    const [result] = await renameApprovedDocuments(directory, [makeDocument()])

    expect(result.status).toBe('ERRO')
    expect(result.error).toContain('integridade')
    expect(files.has('origem.jpg')).toBe(true)
    expect([...files.get('origem.jpg')!]).toEqual([...original])
    expect(removed).toEqual([])
  })

  it('não altera nada quando o destino já existe', async () => {
    const original = new Uint8Array([1, 2, 3, 4])
    const existing = new Uint8Array([8, 8])
    const { directory, files, removed } = fakeDirectory({
      'origem.jpg': original,
      '001234_c1_frente.jpg': existing,
    })

    const [result] = await renameApprovedDocuments(directory, [makeDocument()])

    expect(result.status).toBe('ERRO')
    expect(result.error).toContain('Já existe')
    expect([...files.get('origem.jpg')!]).toEqual([...original])
    expect([...files.get('001234_c1_frente.jpg')!]).toEqual([...existing])
    expect(removed).toEqual([])
  })

  it('detecta colisão sem diferenciar maiúsculas de minúsculas', async () => {
    const original = new Uint8Array([1, 2, 3, 4])
    const existing = new Uint8Array([7, 7])
    const { directory, files, removed } = fakeDirectory({
      'origem.jpg': original,
      '001234_C1_FRENTE.JPG': existing,
    })

    const [result] = await renameApprovedDocuments(directory, [makeDocument()])

    expect(result.status).toBe('ERRO')
    expect(files.has('origem.jpg')).toBe(true)
    expect([...files.get('001234_C1_FRENTE.JPG')!]).toEqual([...existing])
    expect(removed).toEqual([])
  })

  it('preserva arquivo original vazio para revisão', async () => {
    const { directory, files, removed } = fakeDirectory({ 'origem.jpg': new Uint8Array() })

    const [result] = await renameApprovedDocuments(directory, [makeDocument()])

    expect(result.status).toBe('ERRO')
    expect(result.error).toContain('vazio')
    expect(files.has('origem.jpg')).toBe(true)
    expect(files.has('001234_c1_frente.jpg')).toBe(false)
    expect(removed).toEqual([])
  })

  it('permite renomeação automática de item em revisão quando explicitamente autorizado', async () => {
    const original = new Uint8Array([1, 2, 3, 4])
    const { directory, files } = fakeDirectory({ 'origem.jpg': original })

    const [result] = await renameApprovedDocuments(
      directory,
      [makeDocument({ reviewStatus: 'REVISAR' })],
      { requireOk: false },
    )

    expect(result.status).toBe('RENOMEADO')
    expect(files.has('origem.jpg')).toBe(false)
    expect(files.has('001234_c1_frente.jpg')).toBe(true)
  })

  it('não escreve quando a permissão readwrite é negada', async () => {
    const original = new Uint8Array([1, 2, 3, 4])
    const { directory, files, removed } = fakeDirectory({ 'origem.jpg': original })
    directory.queryPermission = async () => 'denied'

    const [result] = await renameApprovedDocuments(directory, [makeDocument()])

    expect(result.status).toBe('ERRO')
    expect(result.error).toContain('Permissão de escrita')
    expect(files.has('origem.jpg')).toBe(true)
    expect(files.has('001234_c1_frente.jpg')).toBe(false)
    expect(removed).toEqual([])
  })
})
