export type DocumentKind =
  | 'FICHA_C1'
  | 'FICHA_C1_VERSO'
  | 'ENVELOPE'
  | 'RECIBO_ATENDIMENTO'
  | 'DECLARACAO_TRANSITO'
  | 'NAO_PADRONIZADO'

export type CaseMode = 'REUNIAO' | 'EMERGENCIA'

export type ReviewStatus = 'PENDENTE' | 'OK' | 'REVISAR' | 'NAO_CONFORME'

export type FieldStatus = 'OK' | 'REVISAR' | 'NAO_CONFORME' | 'NAO_AVALIADO'

export type RenameState = 'NAO_RENOMEADO' | 'RENOMEADO' | 'ERRO'

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
  receiptDate?: string | null
  signatureDate?: string | null
  caseMode: CaseMode | null
  isMonthly: boolean
  suggestedName: string | null
  confidence: number | null
  reviewStatus: ReviewStatus
  validations: DocumentValidation[]
  renameState?: RenameState
  lastRenameError?: string | null
}
