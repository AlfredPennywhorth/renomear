import { useEffect, useRef } from 'react'
import type { AnalyzedDocument } from '../domain/document'

type Props = {
  documents: AnalyzedDocument[]
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}

function BatchRenameConfirm({ documents, busy, onCancel, onConfirm }: Props) {
  const dialogRef = useRef<HTMLElement>(null)

  useEffect(() => {
    dialogRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [busy, onCancel])

  return (
    <section
      ref={dialogRef}
      className="batch-confirm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-title"
      tabIndex={-1}
    >
      <header>
        <div>
          <p className="eyebrow">Confirmação final</p>
          <h2 id="batch-title">Renomear {documents.length} arquivo(s)?</h2>
          <p>Confira os nomes antes de alterar a pasta. A confirmação renomeia os arquivos listados; ela não aprova a auditoria documental.</p>
        </div>
      </header>

      <div className="batch-list">
        {documents.map((document) => (
          <article key={document.id}>
            <span>{document.originalName}</span>
            <strong>{document.suggestedName}</strong>
          </article>
        ))}
      </div>

      <div className="batch-warning">
        O Renomear verificará conflitos novamente antes de cada alteração, validará a integridade da cópia e só então removerá o nome original.
      </div>

      <footer>
        <button type="button" className="secondary-button" onClick={onCancel} disabled={busy}>Cancelar</button>
        <button type="button" onClick={onConfirm} disabled={busy}>
          {busy ? 'Renomeando…' : 'Confirmar renomeação'}
        </button>
      </footer>
    </section>
  )
}

export default BatchRenameConfirm
