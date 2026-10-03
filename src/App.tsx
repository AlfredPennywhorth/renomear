import { useMemo, useState } from 'react'
import ReviewPanel from './components/ReviewPanel'
import type { AnalyzedDocument } from './domain/document'
import { listSupportedDocuments } from './services/local-files'

type DirectoryHandle = {
  name: string
  values: () => AsyncIterableIterator<unknown>
}

type PickerWindow = typeof window & {
  showDirectoryPicker?: () => Promise<DirectoryHandle>
}

function App() {
  const [folderName, setFolderName] = useState<string | null>(null)
  const [documents, setDocuments] = useState<AnalyzedDocument[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [message, setMessage] = useState('Nenhuma pasta selecionada.')
  const [busy, setBusy] = useState(false)

  const selectedDocument = documents.find((document) => document.id === selectedId) ?? null

  const counts = useMemo(() => ({
    total: documents.length,
    pending: documents.filter((item) => item.reviewStatus === 'PENDENTE').length,
    review: documents.filter((item) => item.reviewStatus === 'REVISAR').length,
    ok: documents.filter((item) => item.reviewStatus === 'OK').length,
  }), [documents])

  const selectFolder = async () => {
    const picker = (window as PickerWindow).showDirectoryPicker

    if (!picker) {
      setMessage('Este navegador não oferece acesso direto a pastas. O modo alternativo será implementado antes do MVP.')
      return
    }

    try {
      setBusy(true)
      const directory = await picker()
      const listed = await listSupportedDocuments(directory)

      setFolderName(directory.name)
      setDocuments(listed)
      setSelectedId(null)
      setMessage(
        listed.length === 0
          ? 'Nenhum PDF ou arquivo de imagem suportado foi encontrado.'
          : `${listed.length} documento(s) encontrado(s). Nenhum arquivo foi enviado para servidor.`,
      )
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setMessage('Seleção cancelada.')
      } else {
        setMessage('Não foi possível ler a pasta selecionada.')
      }
    } finally {
      setBusy(false)
    }
  }

  const updateDocument = (updated: AnalyzedDocument) => {
    setDocuments((current) =>
      current.map((document) => document.id === updated.id ? updated : document),
    )
  }

  const statusClass = (status: AnalyzedDocument['reviewStatus']) =>
    status.toLowerCase().replace('_', '-')

  return (
    <main className="shell">
      <section className="workspace">
        <header className="hero">
          <div>
            <p className="eyebrow">Processamento local</p>
            <h1>Renomear</h1>
            <p className="lede">
              Selecione uma pasta, confira os documentos encontrados e acompanhe a fila de validação.
              Os arquivos permanecem no seu computador.
            </p>
          </div>
          <button type="button" onClick={selectFolder} disabled={busy}>
            {busy ? 'Lendo pasta…' : folderName ? 'Trocar pasta' : 'Selecionar pasta'}
          </button>
        </header>

        <div className="privacy-note" role="status">
          <strong>Privacidade:</strong> esta etapa apenas enumera arquivos locais compatíveis.
          Nenhum conteúdo é enviado ao servidor.
        </div>

        <section className="summary-grid" aria-label="Resumo">
          <article><span>Total</span><strong>{counts.total}</strong></article>
          <article><span>Pendentes</span><strong>{counts.pending}</strong></article>
          <article><span>Revisar</span><strong>{counts.review}</strong></article>
          <article><span>OK</span><strong>{counts.ok}</strong></article>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Fila de documentos</h2>
              <p>{folderName ? `Pasta: ${folderName}` : 'Selecione uma pasta para começar.'}</p>
            </div>
            <span className="status-pill">{message}</span>
          </div>

          {documents.length === 0 ? (
            <div className="empty-state">
              <p>Nenhum documento carregado.</p>
              <small>Formatos previstos: JPG, JPEG, PNG, WEBP e PDF.</small>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Arquivo atual</th>
                    <th>Tipo</th>
                    <th>Prontuário</th>
                    <th>Sequência</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((document) => (
                    <tr key={document.id}>
                      <td className="file-name">{document.originalName}</td>
                      <td>{document.kind ?? 'A identificar'}</td>
                      <td>{document.prontuario ?? '—'}</td>
                      <td>{document.numeroDocumento ?? '—'}</td>
                      <td><span className={`badge ${statusClass(document.reviewStatus)}`}>{document.reviewStatus}</span></td>
                      <td>
                        <button className="table-action" type="button" onClick={() => setSelectedId(document.id)}>
                          Revisar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>

      {selectedDocument && (
        <>
          <button className="drawer-backdrop" aria-label="Fechar revisão" onClick={() => setSelectedId(null)} />
          <ReviewPanel
            document={selectedDocument}
            onClose={() => setSelectedId(null)}
            onChange={updateDocument}
          />
        </>
      )}
    </main>
  )
}

export default App
