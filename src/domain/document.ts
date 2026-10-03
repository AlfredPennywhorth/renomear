export type DocumentKind =
  | 'FICHA_C1'
  | 'ENVELOPE'
  | 'RECIBO_ATENDIMENTO'
  | 'NAO_PADRONIZADO'

export type ReviewStatus = 'PENDENTE' | 'CONFIRMADO' | 'REVISAR'

export interface AnalyzedDocument {
  originalName: string
  kind: DocumentKind | null
  prontuario: string | null
  numeroDocumento: string | null
  suggestedName: string | null
  confidence: number | null
  reviewStatus: ReviewStatus
}
