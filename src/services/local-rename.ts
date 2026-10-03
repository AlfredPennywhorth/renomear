import type { AnalyzedDocument } from '../domain/document'

type WritableLike = {
  write: (data: Blob) => Promise<void>
  close: () => Promise<void>
}

type FileHandleLike = {
  getFile: () => Promise<File>
  createWritable: () => Promise<WritableLike>
}

export type DirectoryHandleLike = {
  name: string
  values: () => AsyncIterableIterator<unknown>
  getFileHandle: (name: string, options?: { create?: boolean }) => Promise<FileHandleLike>
  removeEntry: (name: string) => Promise<void>
}

export type RenameResult = {
  id: string
  from: string
  to: string
  status: 'RENOMEADO' | 'IGNORADO' | 'ERRO'
  error?: string
}

async function fileExists(directory: DirectoryHandleLike, name: string): Promise<boolean> {
  try {
    await directory.getFileHandle(name)
    return true
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotFoundError') return false
    throw error
  }
}

async function renameOne(directory: DirectoryHandleLike, document: AnalyzedDocument): Promise<RenameResult> {
  const target = document.suggestedName
  if (document.reviewStatus !== 'OK' || !target) {
    return { id: document.id, from: document.originalName, to: target ?? '', status: 'IGNORADO' }
  }
  if (document.originalName === target) {
    return { id: document.id, from: document.originalName, to: target, status: 'IGNORADO' }
  }
  if (await fileExists(directory, target)) {
    return { id: document.id, from: document.originalName, to: target, status: 'ERRO', error: 'Já existe um arquivo com o nome proposto.' }
  }

  const sourceHandle = await directory.getFileHandle(document.originalName)
  const sourceFile = await sourceHandle.getFile()
  const targetHandle = await directory.getFileHandle(target, { create: true })

  try {
    const writable = await targetHandle.createWritable()
    await writable.write(sourceFile)
    await writable.close()
    await directory.removeEntry(document.originalName)
    return { id: document.id, from: document.originalName, to: target, status: 'RENOMEADO' }
  } catch (error) {
    try {
      await directory.removeEntry(target)
    } catch {
      // Melhor esforço: o original é preservado até a exclusão final.
    }
    return {
      id: document.id,
      from: document.originalName,
      to: target,
      status: 'ERRO',
      error: error instanceof Error ? error.message : 'Falha ao renomear o arquivo.',
    }
  }
}

export async function renameApprovedDocuments(directory: DirectoryHandleLike, documents: AnalyzedDocument[]): Promise<RenameResult[]> {
  const results: RenameResult[] = []
  for (const document of documents) {
    if (document.reviewStatus !== 'OK' || !document.suggestedName) continue
    results.push(await renameOne(directory, document))
  }
  return results
}
