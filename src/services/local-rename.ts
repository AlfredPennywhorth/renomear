import type { AnalyzedDocument } from '../domain/document'

type WritableLike = {
  write: (data: Blob) => Promise<void>
  close: () => Promise<void>
  abort?: () => Promise<void>
}

type FileHandleLike = {
  getFile: () => Promise<File>
  createWritable: () => Promise<WritableLike>
  move?: (name: string) => Promise<void>
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

async function fileExists(
  directory: DirectoryHandleLike,
  name: string,
  excludeExactName?: string,
): Promise<boolean> {
  const expected = name.toLocaleLowerCase('pt-BR')
  for await (const rawEntry of directory.values()) {
    const entry = rawEntry as { name?: string }
    if (!entry.name || entry.name === excludeExactName) continue
    if (entry.name.toLocaleLowerCase('pt-BR') === expected) return true
  }

  if (excludeExactName) return false

  try {
    await directory.getFileHandle(name)
    return true
  } catch (error) {
    if (isNotFound(error)) return false
    throw error
  }
}

async function sha256(file: Blob): Promise<string> {
  const bytes = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}

async function verifySameContent(source: Blob, written: File): Promise<boolean> {
  if (source.size !== written.size) return false
  if (source.size === 0) return true
  return (await sha256(source)) === (await sha256(written))
}

export function rotationOutputMime(file: Pick<File, 'type' | 'name'>): string {
  if (file.type === 'image/png' || /\.png$/i.test(file.name)) return 'image/png'
  if (file.type === 'image/webp' || /\.webp$/i.test(file.name)) return 'image/webp'
  return 'image/jpeg'
}

async function rotateImage(file: File, degrees: 90 | 180 | 270): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  try {
    const swap = degrees === 90 || degrees === 270
    const canvas = document.createElement('canvas')
    canvas.width = swap ? bitmap.height : bitmap.width
    canvas.height = swap ? bitmap.width : bitmap.height
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) throw new Error('Não foi possível aplicar a correção de orientação.')

    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.translate(canvas.width / 2, canvas.height / 2)
    context.rotate((degrees * Math.PI) / 180)
    context.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2)

    const mime = rotationOutputMime(file)
    const quality = mime === 'image/png' ? undefined : 0.96
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, mime, quality),
    )
    if (!blob) throw new Error('Não foi possível gerar a imagem orientada.')
    return blob
  } finally {
    bitmap.close()
  }
}

async function contentForRename(document: AnalyzedDocument, sourceFile: File): Promise<Blob> {
  const rotation = document.rotationDegrees ?? 0
  if (rotation === 0) return sourceFile

  const isImage =
    sourceFile.type.startsWith('image/') ||
    /\.(jpe?g|png|webp)$/i.test(sourceFile.name)

  if (!isImage) return sourceFile
  return rotateImage(sourceFile, rotation)
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

async function renameOne(
  directory: DirectoryHandleLike,
  document: AnalyzedDocument,
  requireOk: boolean,
): Promise<RenameResult> {
  const target = document.suggestedName
  if ((requireOk && document.reviewStatus !== 'OK') || !target) {
    return { id: document.id, from: document.originalName, to: target ?? '', status: 'IGNORADO' }
  }
  if (document.originalName === target && !document.rotationDegrees) {
    return { id: document.id, from: document.originalName, to: target, status: 'IGNORADO' }
  }

  const caseOnlyChange =
    document.originalName.toLocaleLowerCase('pt-BR') === target.toLocaleLowerCase('pt-BR')

  if (await fileExists(directory, target, caseOnlyChange ? document.originalName : undefined)) {
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
  if (sourceFile.size === 0) {
    return {
      id: document.id,
      from: document.originalName,
      to: target,
      status: 'ERRO',
      error: 'O arquivo original está vazio. Ele foi preservado e deve ser revisado.',
    }
  }

  const content = await contentForRename(document, sourceFile)
  const tempName = '.renomear-' + crypto.randomUUID() + '.tmp'
  let tempHandle: FileHandleLike | null = null
  let writable: WritableLike | null = null
  let sourceMovedAside = false
  let targetPromoted = false
  const sourceBackupName = '.renomear-source-' + crypto.randomUUID() + '.bak'

  try {
    tempHandle = await directory.getFileHandle(tempName, { create: true })
    writable = await tempHandle.createWritable()
    await writable.write(content)
    await writable.close()
    writable = null

    const tempFile = await tempHandle.getFile()
    if (!(await verifySameContent(content, tempFile))) {
      throw new Error('A cópia temporária não passou pela verificação de integridade.')
    }

    if (typeof tempHandle.move !== 'function') {
      throw new Error(
        'Este navegador não oferece renomeação atômica segura. O arquivo original foi preservado.',
      )
    }

    // Em troca apenas de caixa (ex.: _dt -> _DT), sistemas de arquivos
    // case-insensitive consideram origem e destino o mesmo nome. Movemos a origem
    // para um backup temporário somente depois que a nova cópia foi criada e verificada.
    if (caseOnlyChange) {
      if (typeof sourceHandle.move !== 'function') {
        throw new Error(
          'Este navegador não oferece renomeação segura para ajustar maiúsculas/minúsculas.',
        )
      }
      await sourceHandle.move(sourceBackupName)
      sourceMovedAside = true
    }

    // O destino nunca é aberto para escrita. A promoção usa move() do próprio
    // handle temporário, evitando sobrescrever silenciosamente outro arquivo.
    if (await fileExists(directory, target)) {
      throw new Error('O nome de destino passou a existir durante a operação.')
    }

    await tempHandle.move(target)
    targetPromoted = true
    tempHandle = null

    const writtenHandle = await directory.getFileHandle(target)
    const writtenFile = await writtenHandle.getFile()
    if (!(await verifySameContent(content, writtenFile))) {
      throw new Error(
        'O arquivo promovido não passou pela verificação de integridade. O original foi preservado.',
      )
    }

    if (sourceMovedAside) {
      await directory.removeEntry(sourceBackupName)
      sourceMovedAside = false
    } else {
      await directory.removeEntry(document.originalName)
    }
    return { id: document.id, from: document.originalName, to: target, status: 'RENOMEADO' }
  } catch (error) {
    if (targetPromoted && sourceMovedAside) {
      try {
        await directory.removeEntry(target)
        targetPromoted = false
      } catch {
        // Melhor esforço: o backup da origem continua preservado.
      }
    }

    if (sourceMovedAside) {
      try {
        await sourceHandle.move?.(document.originalName)
        sourceMovedAside = false
      } catch {
        // Se o rollback falhar, a origem continua preservada no backup temporário.
      }
    }

    if (writable?.abort) {
      try {
        await writable.abort()
      } catch {
        // Melhor esforço; o arquivo original ainda não foi removido.
      }
    }

    if (tempHandle) {
      try {
        await directory.removeEntry(tempName)
      } catch {
        // Melhor esforço para limpar temporário; nunca removemos o original aqui.
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
  options: { requireOk?: boolean } = {},
): Promise<RenameResult[]> {
  const requireOk = options.requireOk ?? true
  const permission = await ensureReadWritePermission(directory)
  if (!permission) {
    return documents
      .filter((document) => (!requireOk || document.reviewStatus === 'OK') && document.suggestedName)
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
    if ((requireOk && document.reviewStatus !== 'OK') || !document.suggestedName) continue
    results.push(await renameOne(directory, document, requireOk))
  }
  return results
}
