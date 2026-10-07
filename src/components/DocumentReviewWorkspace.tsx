import { useEffect, useRef, useState } from 'react'
import type { AnalyzedDocument } from '../domain/document'
import type { DirectoryHandleLike } from '../services/local-rename'
import ReviewPanel from './ReviewPanel'
import { rotateDocumentManually } from '../services/review-edit'

type Props = {
  directory: DirectoryHandleLike
  document: AnalyzedDocument
  onClose: () => void
  onChange: (document: AnalyzedDocument) => void
  onReread?: () => void
  rereading?: boolean
}

function isPdf(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

function DocumentReviewWorkspace({ directory, document, onClose, onChange, onReread, rereading = false }: Props) {
  const [url, setUrl] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const imageCanvasRef = useRef<HTMLCanvasElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    dialogRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKeyDown)

    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false

    setUrl(null)
    setFile(null)
    setError(null)

    directory.getFileHandle(document.originalName)
      .then((handle) => handle.getFile())
      .then((loaded) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(loaded)
        setFile(loaded)
        setUrl(objectUrl)
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível abrir a visualização local deste arquivo.')
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [directory, document.originalName])

  useEffect(() => {
    if (!file || isPdf(file)) return
    let cancelled = false
    createImageBitmap(file).then(bitmap => {
      try {
        if (cancelled) return
        const canvas = imageCanvasRef.current
        if (!canvas) return
        const rotation = document.rotationDegrees ?? 0
        const swap = rotation === 90 || rotation === 270
        canvas.width = swap ? bitmap.height : bitmap.width
        canvas.height = swap ? bitmap.width : bitmap.height
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Não foi possível preparar a visualização.')
        context.translate(canvas.width / 2, canvas.height / 2)
        context.rotate(rotation * Math.PI / 180)
        context.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2)
      } finally {
        bitmap.close()
      }
    }).catch(() => {
      if (!cancelled) setError('Não foi possível abrir a visualização local deste arquivo.')
    })
    return () => { cancelled = true }
  }, [file, document.rotationDegrees])


  return (
    <section
      ref={dialogRef}
      className="review-workspace"
      role="dialog"
      aria-modal="true"
      aria-label={'Revisão de ' + document.originalName}
      tabIndex={-1}
    >
      <div className="review-workspace-preview">
        <header>
          <div>
            <p className="eyebrow">Documento</p>
            <h2>{document.originalName}</h2>
          </div>
          <span className={'badge ' + document.reviewStatus.toLowerCase().replace('_', '-')}>
            {document.reviewStatus}
          </span>
        </header>

        <div className="review-rotation-controls">
          <button type="button" className="secondary-button" disabled={rereading || !file || !!error || isPdf(file)}
            onClick={() => onChange(rotateDocumentManually(document, 'LEFT'))}>
            Girar à esquerda ↶
          </button>
          <button type="button" className="secondary-button" disabled={rereading || !file || !!error || isPdf(file)}
            onClick={() => onChange(rotateDocumentManually(document, 'RIGHT'))}>
            Girar à direita ↷
          </button>
          {onReread && <button type="button" className="secondary-button"
            disabled={rereading || !file || !!error || isPdf(file)} onClick={onReread}>
            {rereading ? 'Relendo…' : 'Reler nesta orientação'}
          </button>}
          {file && isPdf(file) && <span>A gravação de rotação em PDF ainda não está disponível.</span>}
        </div>

        <div className="review-document-stage">
          {error && <p className="preview-message">{error}</p>}
          {!error && !url && <p className="preview-message">Abrindo arquivo…</p>}
          {url && file && (
            isPdf(file)
              ? <iframe title={'Documento PDF: ' + document.originalName} src={url} className="review-pdf" />
              : <canvas
                ref={imageCanvasRef}
                role="img"
                aria-label={'Documento ' + document.originalName}
                className="review-image"
              />
          )}
        </div>

        <p className="review-workspace-note">
          Visualização local. O arquivo não é enviado ao servidor.
          {document.rotationDegrees ? ' Rotação pendente de gravação: ' + document.rotationDegrees + '°.' : ''}
        </p>
      </div>

      <div className="review-workspace-fields">
        <fieldset disabled={rereading} style={{ border: 0, padding: 0, margin: 0 }}>
        <ReviewPanel
          document={document}
          onClose={onClose}
          onChange={onChange}
          embedded
        />
        </fieldset>
      </div>
    </section>
  )
}

export default DocumentReviewWorkspace
