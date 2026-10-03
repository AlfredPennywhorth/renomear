export type DocumentKind =
  | 'FICHA_C1'
  | 'ENVELOPE'
  | 'RECIBO_ATENDIMENTO'
  | 'NAO_PADRONIZADO'

export type ReviewStatus = 'PENDENTE' | 'OK' | 'REVISAR' | 'NAO_CONFORME'

export type FieldStatus = 'OK' | 'REVISAR' | 'NAO_CONFORME' | 'NAO_AVALIADO'

export interface DocumentValidation {
  id: string
  label: string
  value: string | null
  status: FieldStatus
  note?: string
}

export interface AnalyzedDocument {
  id: string
  originalName: string
  kind: DocumentKind | null
  prontuario: string | null
  numeroDocumento: string | null
  documentDate: string | null
  suggestedName: string | null
  confidence: number | null
  reviewStatus: ReviewStatus
  validations: DocumentValidation[]
}
