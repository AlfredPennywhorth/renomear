import type { AnalyzedDocument } from '../domain/document'

export const SUPPORTED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf'] as const

type FileLike = {
  name: string
}

type DirectoryHandleLike = {
  name: string
  values: () => AsyncIterableIterator<unknown>
}

type FileSystemEntryLike = {
  kind: 'file' | 'directory'
  name: string
  getFile?: () => Promise<FileLike>
}

function extensionOf(name: string): string {
  const index = name.lastIndexOf('.')
  return index >= 0 ? name.slice(index + 1).toLowerCase() : ''
}

export function isSupportedDocument(name: string): boolean {
  return SUPPORTED_EXTENSIONS.includes(
    extensionOf(name) as (typeof SUPPORTED_EXTENSIONS)[number],
  )
}

export async function listSupportedDocuments(
  directory: DirectoryHandleLike,
): Promise<AnalyzedDocument[]> {
  const documents: AnalyzedDocument[] = []

  for await (const rawEntry of directory.values()) {
    const entry = rawEntry as FileSystemEntryLike
    if (entry.kind !== 'file' || !isSupportedDocument(entry.name)) continue

    documents.push({
      id: crypto.randomUUID(),
      originalName: entry.name,
      kind: null,
      prontuario: null,
      numeroDocumento: null,
      documentDate: null,
      suggestedName: null,
      confidence: null,
      reviewStatus: 'PENDENTE',
      validations: [],
    })
  }

  return documents.sort((a, b) =>
    a.originalName.localeCompare(b.originalName, 'pt-BR', { numeric: true }),
  )
}
