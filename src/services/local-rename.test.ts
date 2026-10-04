import { describe, expect, it } from 'vitest'
import type { AnalyzedDocument } from '../domain/document'
import { renameApprovedDocuments, type DirectoryHandleLike } from './local-rename'

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
  return new File([bytes], name, { type: 'application/octet-stream' })
}

function fakeDirectory(initial: Record<string, Uint8Array>, corruptWrites = false) {
  const files = new Map<string, Uint8Array>(
    Object.entries(initial).map(([name, value]) => [name, new Uint8Array(value)]),
  )
  const removed: string[] = []

  const directory: DirectoryHandleLike = {
    name: 'teste',
    values: async function* () {},
    queryPermission: async () => 'granted',
    requestPermission: async () => 'granted',
    getFileHandle: async (name, options) => {
      if (!files.has(name)) {
        if (!options?.create) throw new DOMException('Não encontrado', 'NotFoundError')
        files.set(name, new Uint8Array())
      }

      return {
        getFile: async () => makeFile(name, files.get(name) ?? new Uint8Array()),
        createWritable: async () => ({
          write: async (data: Blob) => {
            const source = new Uint8Array(await data.arrayBuffer())
            files.set(name, corruptWrites ? new Uint8Array([9, 9, 9]) : source)
          },
          close: async () => {},
          abort: async () => {},
        }),
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
