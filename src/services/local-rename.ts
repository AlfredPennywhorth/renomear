import type { AnalyzedDocument } from '../domain/document'

type WritableLike = {
  write: (data: Blob) => Promise<void>
  close: () => Promise<void>
  abort?: () => Promise<void>
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
  queryPermission?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>
  requestPermission?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>
}

export type RenameResult = {
  id: string
  from: string
  to: string
  status: 'RENOMEADO' | 'IGNORADO' | 'ERRO'
  error?: string
}

function isNotFound(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'NotFoundError'
}

async function fileExists(directory: DirectoryHandleLike, name: string): Promise<boolean> {
  try {
    await directory.getFileHandle(name)
    return true
  } catch (error) {
    if (isNotFound(error)) return false
    throw error
  }
}

async function sha256(file: File): Promise<string> {
  const bytes = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}

async function verifySameContent(source: File, written: File): Promise<boolean> {
  if (source.size !== written.size) return false
  if (source.size === 0) return true
  return (await sha256(source)) === (await sha256(written))
}

export async function ensureReadWritePermission(directory: DirectoryHandleLike): Promise<boolean> {
  const options = { mode: 'readwrite' as const }
  if (directory.queryPermission) {
    const state = await directory.queryPermission(options)
    if (state === 'granted') return true
    if (state === 'denied') return false
  }
  if (directory.requestPermission) {
    return (await directory.requestPermission(options)) === 'granted'
  }
  // Browsers que não expõem os métodos de permissão ainda podem ter concedido
  // readwrite no picker. A tentativa de escrita continuará protegida pelo navegador.
  return true
}

async function renameOne(directory: DirectoryHandleLike, document: AnalyzedDocument): Promise<RenameResult> {
  const target = document.suggestedName
  if (document.reviewStatus !== 'OK' || !target) {
    return { id: document.id, from: document.originalName, to: target ?? '', status: 'IGNORADO' }
  }
  if (document.originalName.localeCompare(target, undefined, { sensitivity: 'accent' }) === 0) {
    return { id: document.id, from: document.originalName, to: target, status: 'IGNORADO' }
  }

  // A checagem é repetida imediatamente antes da criação. A File System Access API
  // não oferece create-exclusive; portanto nunca apagamos o destino em caso de erro.
  if (await fileExists(directory, target)) {
    return {
      id: document.id,
      from: document.originalName,
      to: target,
      status: 'ERRO',
      error: 'Já existe um arquivo com o nome proposto.',
    }
  }

  const sourceHandle = await directory.getFileHandle(document.originalName)
  const sourceFile = await sourceHandle.getFile()

  if (await fileExists(directory, target)) {
    return {
      id: document.id,
      from: document.originalName,
      to: target,
      status: 'ERRO',
      error: 'O nome de destino passou a existir durante a operação. Nenhum arquivo foi alterado.',
    }
  }

  let targetHandle: FileHandleLike
  try {
    targetHandle = await directory.getFileHandle(target, { create: true })
  } catch (error) {
    return {
      id: document.id,
      from: document.originalName,
      to: target,
      status: 'ERRO',
      error: error instanceof Error ? error.message : 'Não foi possível criar o arquivo de destino.',
    }
  }

  let writable: WritableLike | null = null
  try {
    writable = await targetHandle.createWritable()
    await writable.write(sourceFile)
    await writable.close()
    writable = null

    const writtenFile = await targetHandle.getFile()
    const integrityOk = await verifySameContent(sourceFile, writtenFile)
    if (!integrityOk) {
      return {
        id: document.id,
        from: document.originalName,
        to: target,
        status: 'ERRO',
        error: 'A cópia não passou pela verificação de integridade. O arquivo original foi preservado.',
      }
    }

    await directory.removeEntry(document.originalName)
    return { id: document.id, from: document.originalName, to: target, status: 'RENOMEADO' }
  } catch (error) {
    if (writable?.abort) {
      try {
        await writable.abort()
      } catch {
        // Melhor esforço. O original permanece intacto enquanto removeEntry não ocorrer.
      }
    }
    return {
      id: document.id,
      from: document.originalName,
      to: target,
      status: 'ERRO',
      error: error instanceof Error ? error.message : 'Falha ao renomear o arquivo. O original foi preservado.',
    }
  }
}

export async function renameApprovedDocuments(
  directory: DirectoryHandleLike,
  documents: AnalyzedDocument[],
): Promise<RenameResult[]> {
  const permission = await ensureReadWritePermission(directory)
  if (!permission) {
    return documents
      .filter((document) => document.reviewStatus === 'OK' && document.suggestedName)
      .map((document) => ({
        id: document.id,
        from: document.originalName,
        to: document.suggestedName ?? '',
        status: 'ERRO' as const,
        error: 'Permissão de escrita não concedida para a pasta selecionada.',
      }))
  }

  const results: RenameResult[] = []
  for (const document of documents) {
    if (document.reviewStatus !== 'OK' || !document.suggestedName) continue
    results.push(await renameOne(directory, document))
  }
  return results
}
