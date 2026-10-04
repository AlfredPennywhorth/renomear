import { useMemo, useState } from 'react'
import BatchRenameConfirm from './components/BatchRenameConfirm'
import DocumentReviewWorkspace from './components/DocumentReviewWorkspace'
import HowToUse from './components/HowToUse'
import QualityDashboard from './components/QualityDashboard'
import SecurityNotice from './components/SecurityNotice'
import type { AnalyzedDocument } from './domain/document'
import { listSupportedDocuments } from './services/local-files'
import { analyzeBatch, summarizeBatch } from './services/batch-processing'
import { analyzeDocumentsWithLocalOcr } from './services/local-ocr'
import { applyCrossDocumentValidations } from './services/cross-document-validation'
import { collectInconsistencies, downloadInconsistencyCsv } from './services/inconsistency-report'
import { renameApprovedDocuments, type DirectoryHandleLike } from './services/local-rename'

type PickerWindow = typeof window & {
  showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<DirectoryHandleLike>
}

function App() {
  const [directory, setDirectory] = useState<DirectoryHandleLike | null>(null)
  const [documents, setDocuments] = useState<AnalyzedDocument[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [message, setMessage] = useState('Nenhuma pasta selecionada.')
  const [busy, setBusy] = useState(false)
  const [renameBusy, setRenameBusy] = useState(false)
  const [processingBusy, setProcessingBusy] = useState(false)
  const [securityAccepted, setSecurityAccepted] = useState(false)
  const [batchCandidates, setBatchCandidates] = useState<AnalyzedDocument[]>([])
  const [activeView, setActiveView] = useState<'DOCUMENTOS' | 'DASHBOARD' | 'COMO_USAR'>('DOCUMENTOS')

  const selectedDocument = documents.find((document) => document.id === selectedId) ?? null

  const duplicateNames = useMemo(() => {
    const counts = new Map<string, number>()
    for (const document of documents) {
      if (!document.suggestedName) continue
      const normalized = document.suggestedName.toLocaleLowerCase('pt-BR')
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
    }
    return new Set(
      [...counts.entries()]
        .filter(([, count]) => count > 1)
        .map(([name]) => name),
    )
  }, [documents])

  const inconsistencies = useMemo(() => collectInconsistencies(documents), [documents])

  const counts = useMemo(() => ({
    total: documents.length,
    pending: documents.filter((item) => item.reviewStatus === 'PENDENTE').length,
    review: documents.filter((item) => item.reviewStatus === 'REVISAR').length,
    ok: documents.filter((item) => item.reviewStatus === 'OK').length,
    renamed: documents.filter((item) => item.renameState === 'RENOMEADO').length,
  }), [documents])

  const selectFolder = async () => {
    if (!securityAccepted) {
      setMessage('Confirme as regras de segurança e autorização antes de selecionar a pasta.')
      return
    }
    const picker = (window as PickerWindow).showDirectoryPicker
    if (!picker) {
      setMessage('Este navegador não é compatível com a homologação atual. Use Chrome ou Edge em computador.')
      return
    }

    try {
      setBusy(true)
      const selectedDirectory = await picker({ mode: 'readwrite' })
      const listed = await listSupportedDocuments(selectedDirectory)
      setDirectory(selectedDirectory)
      setDocuments(applyCrossDocumentValidations(listed))
      setSelectedId(null)
      setMessage(listed.length === 0
        ? 'Nenhum PDF ou arquivo de imagem suportado foi encontrado.'
        : String(listed.length) + ' documento(s) encontrado(s). Nenhum arquivo foi enviado para servidor.')
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
      applyCrossDocumentValidations(
        current.map((document) => document.id === updated.id ? updated : document),
      ),
    )
  }

  const processBatch = async () => {
    if (!directory || documents.length === 0) {
      setMessage('Selecione uma pasta com documentos antes de processar o lote.')
      return
    }

    try {
      setProcessingBusy(true)
      const ocrAnalyzed = await analyzeDocumentsWithLocalOcr(
        directory,
        documents,
        (progress) => {
          const percent = typeof progress.progress === 'number'
            ? ' — ' + String(Math.round(progress.progress * 100)) + '%'
            : ''
          setMessage(
            'OCR ' + String(progress.current) + '/' + String(progress.total) +
            ': ' + progress.fileName + ' — ' + progress.status + percent,
          )
        },
      )
      const analyzed = analyzeBatch(ocrAnalyzed)
      const summary = summarizeBatch(analyzed)

      const nameCounts = new Map<string, number>()
      for (const document of analyzed) {
        if (!document.suggestedName) continue
        const key = document.suggestedName.toLocaleLowerCase('pt-BR')
        nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1)
      }

      const automaticCandidates = analyzed.filter((document) => {
        if (document.reviewStatus !== 'OK' || !document.suggestedName) return false
        const key = document.suggestedName.toLocaleLowerCase('pt-BR')
        return (nameCounts.get(key) ?? 0) === 1 && document.originalName !== document.suggestedName
      })

      let nextDocuments = analyzed
      let renamed = 0
      let renameErrors = 0

      if (automaticCandidates.length > 0) {
        const results = await renameApprovedDocuments(directory, automaticCandidates)
        const byId = new Map(results.map((result) => [result.id, result]))
        renamed = results.filter((result) => result.status === 'RENOMEADO').length
        renameErrors = results.filter((result) => result.status === 'ERRO').length

        nextDocuments = analyzed.map((document) => {
          const result = byId.get(document.id)
          if (!result) return document
          if (result.status === 'RENOMEADO') {
            return {
              ...document,
              originalName: result.to,
              renameState: 'RENOMEADO' as const,
              lastRenameError: null,
            }
          }
          if (result.status === 'ERRO') {
            return {
              ...document,
              reviewStatus: 'REVISAR' as const,
              renameState: 'ERRO' as const,
              lastRenameError: result.error ?? 'Falha ao renomear.',
            }
          }
          return document
        })
      }

      setDocuments(nextDocuments)
      setMessage(
        String(summary.total) + ' analisado(s): ' +
        String(renamed) + ' renomeado(s) automaticamente; ' +
        String(summary.revisar + renameErrors) + ' para revisão; ' +
        String(summary.naoConformes) + ' não conforme(s).',
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha no processamento do lote.')
    } finally {
      setProcessingBusy(false)
    }
  }

  const renameApproved = async () => {
    if (!directory) return
    const candidates = documents.filter((document) =>
      document.reviewStatus === 'OK' &&
      document.suggestedName &&
      document.originalName !== document.suggestedName
    )

    if (candidates.length === 0) {
      setMessage('Não há documentos aprovados aguardando renomeação.')
      return
    }

    const duplicateApproved = candidates.filter(
      (document) =>
        document.suggestedName &&
        duplicateNames.has(document.suggestedName.toLocaleLowerCase('pt-BR')),
    )
    if (duplicateApproved.length > 0) {
      setMessage('Há nomes propostos duplicados entre os documentos aprovados. Corrija-os antes de renomear.')
      return
    }

    setBatchCandidates(candidates)
  }

  const confirmRenameApproved = async () => {
    if (!directory || batchCandidates.length === 0) return

    try {
      setRenameBusy(true)
      const results = await renameApprovedDocuments(directory, batchCandidates)
      const byId = new Map(results.map((result) => [result.id, result]))

      setDocuments((current) => current.map((document) => {
        const result = byId.get(document.id)
        if (!result) return document
        if (result.status === 'RENOMEADO') {
          return {
            ...document,
            originalName: result.to,
            renameState: 'RENOMEADO' as const,
            lastRenameError: null,
          }
        }
        if (result.status === 'ERRO') {
          return {
            ...document,
            renameState: 'ERRO' as const,
            lastRenameError: result.error ?? 'Falha ao renomear.',
          }
        }
        return document
      }))

      const renamed = results.filter((result) => result.status === 'RENOMEADO').length
      const errors = results.filter((result) => result.status === 'ERRO').length
      setMessage(errors
        ? String(renamed) + ' arquivo(s) renomeado(s); ' + String(errors) + ' requer(em) revisão.'
        : String(renamed) + ' arquivo(s) renomeado(s) com sucesso.')
      setBatchCandidates([])
    } finally {
      setRenameBusy(false)
    }
  }

  const statusClass = (status: AnalyzedDocument['reviewStatus']) =>
    status.toLowerCase().replace('_', '-')

  return (
    <main className="shell">
      <section className="workspace">
        <nav className="app-nav" aria-label="Navegação principal">
          <button
            type="button"
            className={activeView === 'DOCUMENTOS' ? 'nav-button active' : 'nav-button'}
            onClick={() => setActiveView('DOCUMENTOS')}
          >
            Documentos
          </button>
          <button
            type="button"
            className={activeView === 'DASHBOARD' ? 'nav-button active' : 'nav-button'}
            onClick={() => setActiveView('DASHBOARD')}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={activeView === 'COMO_USAR' ? 'nav-button active' : 'nav-button'}
            onClick={() => setActiveView('COMO_USAR')}
          >
            Como usar
          </button>
        </nav>

        {activeView === 'DOCUMENTOS' && (
          <>
        <header className="hero">
          <div>
            <p className="eyebrow">Processamento local</p>
            <h1>Renomear</h1>
            <p className="lede">
              Selecione uma pasta, confira os documentos encontrados e acompanhe a fila de validação.
              Os arquivos permanecem no seu computador.
            </p>
          </div>
          <div className="hero-actions">
            {directory && inconsistencies.length > 0 && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => downloadInconsistencyCsv(inconsistencies)}
                disabled={renameBusy || processingBusy}
              >
                Exportar inconsistências ({inconsistencies.length})
              </button>
            )}
            {directory && (
              <>
                <button type="button" className="secondary-button" onClick={renameApproved} disabled={renameBusy || processingBusy}>
                  {renameBusy ? 'Renomeando…' : 'Renomear aprovados'}
                </button>
                <button type="button" onClick={processBatch} disabled={processingBusy || renameBusy || documents.length === 0}>
                  {processingBusy ? 'Processando lote…' : 'Processar lote'}
                </button>
              </>
            )}
            <button type="button" onClick={selectFolder} disabled={busy || renameBusy || processingBusy || !securityAccepted}>
              {busy ? 'Lendo pasta…' : directory ? 'Trocar pasta' : 'Selecionar pasta'}
            </button>
          </div>
        </header>

        <SecurityNotice accepted={securityAccepted} onAcceptedChange={setSecurityAccepted} />

        <div className="privacy-note" role="status">
          <strong>Privacidade:</strong> leitura, visualização e renomeação são feitas na pasta escolhida no próprio computador. Nenhum conteúdo é enviado ao servidor. Se a política exigir permanência exclusiva na máquina, não selecione pasta sincronizada com nuvem.
        </div>

        <section className="summary-grid" aria-label="Resumo">
          <article><span>Total</span><strong>{counts.total}</strong></article>
          <article><span>Pendentes</span><strong>{counts.pending}</strong></article>
          <article><span>Revisar</span><strong>{counts.review}</strong></article>
          <article><span>OK</span><strong>{counts.ok}</strong></article>
          <article><span>Renomeados</span><strong>{counts.renamed}</strong></article>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Fila de documentos</h2>
              <p>{directory ? 'Pasta: ' + directory.name : 'Selecione uma pasta para começar.'}</p>
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
                    <th>Nome proposto</th>
                    <th>Prontuário</th>
                    <th>Status</th>
                    <th>Operação</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((document) => (
                    <tr key={document.id}>
                      <td className="file-name">{document.originalName}</td>
                      <td>
                        {document.suggestedName ?? '—'}
                        {document.suggestedName && duplicateNames.has(document.suggestedName.toLocaleLowerCase('pt-BR')) && (
                          <span className="duplicate-warning">Nome duplicado</span>
                        )}
                      </td>
                      <td>{document.prontuario ?? '—'}</td>
                      <td><span className={'badge ' + statusClass(document.reviewStatus)}>{document.reviewStatus}</span></td>
                      <td>
                        {document.renameState === 'RENOMEADO' && <span className="badge ok">RENOMEADO</span>}
                        {document.renameState === 'ERRO' && <span className="badge nao-conforme" title={document.lastRenameError ?? undefined}>ERRO</span>}
                        {!document.renameState && '—'}
                      </td>
                      <td className="row-actions">
                        {directory && document.renameState !== 'RENOMEADO' && (
                          <button className="table-action" type="button" onClick={() => setSelectedId(document.id)}>
                            Revisar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
          </>
        )}

        {activeView === 'DASHBOARD' && (
          <QualityDashboard
            documents={documents}
            inconsistencies={inconsistencies}
            onExport={() => downloadInconsistencyCsv(inconsistencies)}
          />
        )}

        {activeView === 'COMO_USAR' && <HowToUse />}
      </section>

      {directory && selectedDocument && activeView === 'DOCUMENTOS' && (
        <>
          <button className="modal-backdrop" aria-label="Fechar revisão" onClick={() => setSelectedId(null)} />
          <DocumentReviewWorkspace
            directory={directory}
            document={selectedDocument}
            onClose={() => setSelectedId(null)}
            onChange={updateDocument}
          />
        </>
      )}

      {batchCandidates.length > 0 && activeView === 'DOCUMENTOS' && (
        <>
          <button
            className="modal-backdrop"
            aria-label="Cancelar renomeação"
            onClick={() => !renameBusy && setBatchCandidates([])}
          />
          <BatchRenameConfirm
            documents={batchCandidates}
            busy={renameBusy}
            onCancel={() => setBatchCandidates([])}
            onConfirm={confirmRenameApproved}
          />
        </>
      )}
    </main>
  )
}

export default App
