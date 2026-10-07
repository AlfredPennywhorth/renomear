import type { AnalyzedDocument } from '../domain/document'
import type { InconsistencyRow } from '../services/inconsistency-report'
import { calculateQualityMetrics } from '../services/quality-dashboard'

type Props = {
  documents: AnalyzedDocument[]
  inconsistencies: InconsistencyRow[]
  onExport: () => void
}

function QualityDashboard({ documents, inconsistencies, onExport }: Props) {
  const metrics = calculateQualityMetrics(documents, inconsistencies)

  return (
    <section className="quality-dashboard">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">Qualidade documental</p>
          <h2>Dashboard da sessão</h2>
          <p>
            Indicadores calculados somente com os documentos carregados nesta sessão.
            Pendentes não são tratados como conformes nem como não conformes.
          </p>
        </div>
        {inconsistencies.length > 0 && (
          <button type="button" className="secondary-button" onClick={onExport}>
            Exportar inconsistências ({inconsistencies.length})
          </button>
        )}
      </div>

      <div className="dashboard-kpis">
        <article>
          <span>Conformidade dos avaliados</span>
          <strong>{metrics.conformityRate}%</strong>
          <small>{metrics.ok} OK de {metrics.evaluated} avaliados</small>
        </article>
        <article>
          <span>Cobertura da conferência</span>
          <strong>{metrics.reviewCoverage}%</strong>
          <small>{metrics.evaluated} de {metrics.total} documentos avaliados</small>
        </article>
        <article>
          <span>Para revisar</span>
          <strong>{metrics.revisar}</strong>
          <small>leituras ou regras que exigem decisão humana</small>
        </article>
        <article>
          <span>Não conformes</span>
          <strong>{metrics.naoConforme}</strong>
          <small>falhas de procedimento confirmadas</small>
        </article>
        <article>
          <span>Inconsistências registradas</span>
          <strong>{metrics.issueCount}</strong>
          <small>linhas disponíveis no relatório</small>
        </article>
      </div>

      <div className="dashboard-grid">
        <section className="dashboard-card">
          <h3>Qualidade por tipo documental</h3>
          {metrics.byType.length === 0 ? (
            <p className="muted">Carregue documentos para visualizar os indicadores.</p>
          ) : (
            <div className="quality-type-list">
              {metrics.byType.map((row) => {
                const evaluated = row.ok + row.revisar + row.naoConforme
                const rate = evaluated === 0 ? 0 : Math.round((row.ok / evaluated) * 100)
                return (
                  <div className="quality-type-row" key={row.kind}>
                    <div>
                      <strong>{row.kind}</strong>
                      <span>{row.total} documento(s) · {rate}% conformes entre avaliados</span>
                    </div>
                    <div className="quality-mini-stats">
                      <span className="mini-ok">OK {row.ok}</span>
                      <span className="mini-review">Revisar {row.revisar}</span>
                      <span className="mini-bad">Não conforme {row.naoConforme}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="dashboard-card">
          <h3>Inconsistências mais frequentes</h3>
          {metrics.topIssues.length === 0 ? (
            <p className="muted">Nenhuma inconsistência registrada até agora.</p>
          ) : (
            <div className="issue-list">
              {metrics.topIssues.map((item) => {
                const max = metrics.topIssues[0]?.count || 1
                const width = Math.max(10, Math.round((item.count / max) * 100))
                return (
                  <div className="issue-row" key={item.label}>
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.count}</span>
                    </div>
                    <div className="issue-bar"><span style={{ width: width + '%' }} /></div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      <section className="dashboard-card dashboard-notes">
        <h3>Como interpretar</h3>
        <p>
          O índice de conformidade é calculado como documentos OK dividido pelos documentos já avaliados.
          A cobertura mostra quanto da pasta já passou por decisão humana. Uma taxa alta de conformidade com baixa
          cobertura ainda não representa a qualidade final do lote.
        </p>
      </section>
    </section>
  )
}

export default QualityDashboard
