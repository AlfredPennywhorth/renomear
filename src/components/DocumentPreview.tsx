import { useEffect, useRef, useState } from 'react'
import type { DirectoryHandleLike } from '../services/local-rename'
import '../preview.css'

type Props = {
  directory: DirectoryHandleLike
  fileName: string
  onClose: () => void
}

function isPdf(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

function DocumentPreview({ directory, fileName, onClose }: Props) {
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

    directory.getFileHandle(fileName)
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
  }, [directory, fileName])

  return (
    <section
      ref={dialogRef}
      className="preview-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Visualização do documento"
      tabIndex={-1}
    >
      <header>
        <div>
          <p className="eyebrow">Visualização local</p>
          <h2>{fileName}</h2>
        </div>
        <button type="button" className="secondary-button" onClick={onClose}>Fechar</button>
      </header>

      <div className="preview-body">
        {error && <p className="preview-message">{error}</p>}
        {!error && !url && <p className="preview-message">Abrindo arquivo…</p>}
        {url && file && (
          isPdf(file)
            ? <iframe title={'Documento PDF: ' + fileName} src={url} className="pdf-preview" />
            : <img src={url} alt={'Visualização de ' + fileName} className="image-preview" />
        )}
      </div>

      <p className="preview-footnote">
        A visualização usa um endereço temporário criado pelo navegador. Pressione Esc para fechar. O arquivo não é enviado ao servidor.
      </p>
    </section>
  )
}

export default DocumentPreview
