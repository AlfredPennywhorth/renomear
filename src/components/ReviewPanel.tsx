import { useEffect, useState } from 'react'
import type { AnalyzedDocument, DocumentKind, ReviewStatus } from '../domain/document'
import { normalizeProntuario } from '../domain/prontuario'
import { validateBrazilianDate, validateSequence } from '../domain/validation'
import { suggestFileName } from '../services/naming'
import { sequencePatchFromManualEdit, shouldInvalidateRenameState } from '../services/review-edit'

type Props = {
  document: AnalyzedDocument
  onClose: () => void
  onChange: (document: AnalyzedDocument) => void
  embedded?: boolean
}

const kindOptions: Array<{ value: DocumentKind; label: string }> = [
  { value: 'ENVELOPE', label: 'Envelope — frente' },
  { value: 'FICHA_C1', label: 'Ficha C1 — frente' },
  { value: 'FICHA_C1_VERSO', label: 'Ficha C1 — verso / pedido de roupas e diversos' },
  { value: 'RECIBO_ATENDIMENTO', label: 'Recibo de atendimento' },
  { value: 'RECIBO_EMERGENCIA_MANUAL', label: 'Recibo manual de emergência' },
  { value: 'DECLARACAO_TRANSITO', label: 'Declaração de trânsito' },
  { value: 'NAO_PADRONIZADO', label: 'Documento não padronizado' },
]

function formatDateDraft(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return digits.slice(0, 2) + '/' + digits.slice(2)
  return digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/' + digits.slice(4)
}

function ReviewPanel({ document, onClose, onChange, embedded = false }: Props) {
  const [prontuarioDraft, setProntuarioDraft] = useState(document.prontuario ?? '')
  const [sequenceDraft, setSequenceDraft] = useState(document.numeroDocumento ?? '')
  const [dateDraft, setDateDraft] = useState(document.documentDate ?? '')

  useEffect(() => {
    setProntuarioDraft(document.prontuario ?? '')
  }, [document.id, document.prontuario])

  useEffect(() => {
    setSequenceDraft(document.numeroDocumento ?? '')
  }, [document.id, document.numeroDocumento])

  useEffect(() => {
    setDateDraft(document.documentDate ?? '')
  }, [document.id, document.documentDate])
  const update = (patch: Partial<AnalyzedDocument>) => {
    const next = { ...document, ...patch }
    const editableFields = new Set([
      'kind',
      'prontuario',
      'numeroDocumento',
      'documentDate',
      'caseMode',
      'isMonthly',
    ])
    const changedAuditInput = Object.keys(patch).some((key) => editableFields.has(key))
    if (changedAuditInput && patch.reviewStatus === undefined) {
      next.manualReviewApproved = false
      if (document.reviewStatus === 'OK') next.reviewStatus = 'REVISAR'
    }

    next.suggestedName = suggestFileName(next)

    if (shouldInvalidateRenameState(document, patch, next.suggestedName)) {
      next.renameState = undefined
      next.lastRenameError = null
    }

    onChange(next)
  }

  const normalizeAndUpdateProntuario = (value: string) => {
    const normalized = normalizeProntuario(value)
    const nextValue = normalized ?? value.replace(/\D/g, '').slice(0, 6)
    setProntuarioDraft(nextValue)
    update({
      prontuario: normalized,
      prontuarioConfidence: normalized ? 1 : null,
      prontuarioOcrSource: normalized ? 'MANUAL' : null,
      manualReviewApproved: false,
      validations: normalized
        ? document.validations.filter(
            (item) =>
              item.id !== 'ocr-prontuario-conflict' &&
              item.id !== 'ocr-identity-confidence' &&
              item.id !== 'ocr-paddle-unavailable',
          )
        : document.validations,
      reviewStatus: 'REVISAR',
    })
  }

  const commitSequence = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8)
    setSequenceDraft(digits)

    const patch = sequencePatchFromManualEdit(document, digits)
    if (!patch) return

    update(patch)
  }

  const setStatus = (status: ReviewStatus) => {
    if (status === 'OK' && document.reviewStatus === 'NAO_CONFORME') return

    if (status === 'OK') {
      update({
        reviewStatus: 'OK',
        manualReviewApproved: true,
        validations: document.validations.filter(
          (item) =>
            item.id !== 'automation-rule-coverage' &&
            item.id !== 'ocr-confidence' &&
            item.id !== 'ocr-field-confidence' &&
            item.id !== 'ocr-prontuario-conflict' &&
            item.id !== 'ocr-identity-confidence' &&
            item.id !== 'ocr-paddle-unavailable' &&
            item.id !== 'ocr-error',
        ),
      })
      return
    }
    update({ reviewStatus: status, manualReviewApproved: false })
  }

  const sequenceRequired =
    document.kind === 'ENVELOPE' ||
    document.kind === 'RECIBO_ATENDIMENTO' ||
    document.kind === 'DECLARACAO_TRANSITO'

  const sequenceValidation = document.numeroDocumento
    ? validateSequence(document.numeroDocumento)
    : {
        ok: !sequenceRequired,
        normalized: null,
        reason: 'Número/sequência obrigatória para este tipo documental.',
      }

  const dateRequired =
    document.kind === 'ENVELOPE' ||
    document.kind === 'RECIBO_ATENDIMENTO' ||
    document.kind === 'FICHA_C1' ||
    document.kind === 'DECLARACAO_TRANSITO' ||
    document.kind === 'RECIBO_EMERGENCIA_MANUAL'

  const dateValidation = document.documentDate
    ? validateBrazilianDate(document.documentDate)
    : {
        ok: !dateRequired,
        normalized: null,
        reason: 'Data obrigatória para este tipo documental.',
      }

  const prontuarioValidation = document.prontuario
    ? normalizeProntuario(document.prontuario) !== null
    : document.kind === 'FICHA_C1_VERSO'

  const humanResolvable = new Set([
    'automation-rule-coverage',
    'ocr-confidence',
    'ocr-field-confidence',
    'ocr-prontuario-conflict',
    'ocr-identity-confidence',
    'ocr-paddle-unavailable',
    'ocr-error',
    'cross-date-missing',
  ])
  const hasBlockingValidation = document.validations.some(
    (item) =>
      !humanResolvable.has(item.id) &&
      (item.status === 'REVISAR' || item.status === 'NAO_CONFORME'),
  )

  const dateAllowsManualApproval = !document.documentDate || dateValidation.ok

  const canApprove =
    document.reviewStatus !== 'NAO_CONFORME' &&
    Boolean(document.suggestedName) &&
    prontuarioValidation &&
    sequenceValidation.ok &&
    dateAllowsManualApproval &&
    (document.kind !== 'FICHA_C1' || document.caseMode !== null) &&
    (document.kind !== 'FICHA_C1_VERSO' || Boolean(document.prontuario)) &&
    !hasBlockingValidation

  return (
    <aside className={embedded ? 'review-drawer review-drawer-embedded' : 'review-drawer'} aria-label="Revisão do documento">
      <div className="review-header">
        <div>
          <p className="eyebrow">Revisão manual</p>
          <h2>{document.originalName}</h2>
        </div>
        <button className="secondary-button" type="button" onClick={onClose}>Fechar</button>
      </div>

      <div className="review-grid">
        <label>
          Tipo documental
          <select
            value={document.kind ?? ''}
            onChange={(event) => update({ kind: (event.target.value || null) as DocumentKind | null })}
          >
            <option value="">Selecione</option>
            {kindOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label>
          Prontuário
          <input
            inputMode="numeric"
            value={prontuarioDraft}
            placeholder="Ex.: 000136"
            maxLength={6}
            onChange={(event) => setProntuarioDraft(event.target.value.replace(/\D/g, '').slice(0, 6))}
            onBlur={(event) => normalizeAndUpdateProntuario(event.target.value)}
          />
          <small>Até 6 algarismos; zeros à esquerda são completados automaticamente.</small>
        </label>

        <label>
          Sequência / nº documento
          <input
            inputMode="numeric"
            value={sequenceDraft}
            placeholder="Ex.: 054831"
            maxLength={8}
            aria-invalid={!sequenceValidation.ok}
            onChange={(event) => setSequenceDraft(event.target.value.replace(/\D/g, '').slice(0, 8))}
            onBlur={(event) => commitSequence(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
            }}
          />
          {!sequenceValidation.ok && <small className="field-error">{sequenceValidation.reason}</small>}
        </label>

        <label>
          Data do documento
          <input
            type="text"
            inputMode="numeric"
            value={dateDraft}
            placeholder="DD/MM/AAAA"
            aria-invalid={!dateValidation.ok}
            onChange={(event) => setDateDraft(formatDateDraft(event.target.value))}
            onBlur={(event) => update({ documentDate: event.target.value || null })}
          />
          {!dateValidation.ok && <small className="field-error">{dateValidation.reason}</small>}
          <small>A data é usada somente nas validações da auditoria; ela não compõe o nome do arquivo. Se estiver ilegível para o OCR, a conferência humana pode concluir a revisão.</small>
        </label>
      </div>

      {document.kind === 'FICHA_C1' && (
        <section className="document-rules">
          <h3>Tipo do atendimento na C1</h3>
          <div className="choice-row">
            <label>
              <input
                type="radio"
                name={'case-mode-' + document.id}
                checked={document.caseMode === 'REUNIAO'}
                onChange={() => update({ caseMode: 'REUNIAO' })}
              />
              Reunião
            </label>
            <label>
              <input
                type="radio"
                name={'case-mode-' + document.id}
                checked={document.caseMode === 'EMERGENCIA'}
                onChange={() => update({ caseMode: 'EMERGENCIA' })}
              />
              Emergência
            </label>
          </div>
          <small>
            Reunião exige data igual à do envelope/recibo correspondente. Emergência exige data anterior à reunião.
          </small>
        </section>
      )}

      {(document.kind === 'ENVELOPE' || document.kind === 'RECIBO_ATENDIMENTO') && (
        <section className="document-rules">
          <label className="monthly-check">
            <input
              type="checkbox"
              checked={document.isMonthly}
              onChange={(event) => update({ isMonthly: event.target.checked })}
            />
            <span>Atendimento mensal</span>
          </label>
          <small>
            Quando houver indicação “mensal”, não é esperada Ficha C1 correspondente e não será feito o cruzamento com C1.
          </small>
        </section>
      )}

      <section className="rename-preview">
        <span>Nome proposto</span>
        <strong>{document.suggestedName ?? 'Preencha tipo e prontuário para gerar o nome.'}</strong>
      </section>

      <section className="validation-section">
        <div className="section-heading">
          <div>
            <h3>Verificações</h3>
            <p>Alertas automáticos podem ser resolvidos pela conferência humana; não conformidades e cruzamentos continuam bloqueando a aprovação.</p>
          </div>
        </div>

        {document.validations.length === 0 ? (
          <div className="validation-placeholder">
            <span>Sem verificações automáticas ainda.</span>
            <small>O documento pode ser marcado manualmente como OK, Revisar ou Não conforme.</small>
          </div>
        ) : (
          <ul className="validation-list">
            {document.validations.map((item) => (
              <li key={item.id}>
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.value ?? 'Não identificado'}</span>
                </div>
                <span className={`badge ${item.status.toLowerCase().replace('_', '-')}`}>{item.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="review-actions">
        <button type="button" className="review-button" onClick={() => setStatus('REVISAR')}>Marcar para revisar</button>
        <button type="button" className="danger-button" onClick={() => setStatus('NAO_CONFORME')}>Não conforme</button>
        <button
          type="button"
          onClick={() => setStatus('OK')}
          disabled={!canApprove}
          title={!canApprove ? 'Confira tipo, prontuário, número/sequência quando exigido e eventuais não conformidades antes de aprovar.' : undefined}
        >
          Aprovar como OK
        </button>
      </div>
    </aside>
  )
}

export default ReviewPanel
