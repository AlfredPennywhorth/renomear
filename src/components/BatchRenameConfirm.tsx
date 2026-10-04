import type { AnalyzedDocument } from '../domain/document'

type Props = {
  documents: AnalyzedDocument[]
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}

function BatchRenameConfirm({ documents, busy, onCancel, onConfirm }: Props) {
  return (
    <section className="batch-confirm" role="dialog" aria-modal="true" aria-labelledby="batch-title">
      <header>
        <div>
          <p className="eyebrow">Confirmação final</p>
          <h2 id="batch-title">Renomear {documents.length} arquivo(s)?</h2>
          <p>Confira os nomes antes de alterar a pasta. Apenas documentos aprovados como OK aparecem aqui.</p>
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
        O Renomear verificará conflitos novamente antes de cada alteração e não sobrescreverá arquivos existentes.
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
