import { useEffect, useRef, useState } from 'react'
import type { AnalyzedDocument } from '../domain/document'
import type { DirectoryHandleLike } from '../services/local-rename'
import ReviewPanel from './ReviewPanel'

type Props = {
  directory: DirectoryHandleLike
  document: AnalyzedDocument
  onClose: () => void
  onChange: (document: AnalyzedDocument) => void
}

function isPdf(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

function DocumentReviewWorkspace({ directory, document, onClose, onChange }: Props) {
  const [url, setUrl] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLElement>(null)

  useEffect(() => {
    dialogRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

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

        <div className="review-document-stage">
          {error && <p className="preview-message">{error}</p>}
          {!error && !url && <p className="preview-message">Abrindo arquivo…</p>}
          {url && file && (
            isPdf(file)
              ? <iframe title={'Documento PDF: ' + document.originalName} src={url} className="review-pdf" />
              : <img
                src={url}
                alt={'Documento ' + document.originalName}
                className="review-image"
                style={document.rotationDegrees ? { transform: 'rotate(' + document.rotationDegrees + 'deg)' } : undefined}
              />
          )}
        </div>

        <p className="review-workspace-note">
          Visualização local. O arquivo não é enviado ao servidor.
          {document.rotationDegrees ? ' Orientação detectada: ' + document.rotationDegrees + '°.' : ''}
        </p>
      </div>

      <div className="review-workspace-fields">
        <ReviewPanel
          document={document}
          onClose={onClose}
          onChange={onChange}
          embedded
        />
      </div>
    </section>
  )
}

export default DocumentReviewWorkspace
