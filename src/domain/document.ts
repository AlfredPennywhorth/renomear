export type DocumentKind =
  | 'FICHA_C1'
  | 'FICHA_C1_VERSO'
  | 'ENVELOPE'
  | 'RECIBO_ATENDIMENTO'
  | 'RECIBO_EMERGENCIA_MANUAL'
  | 'DECLARACAO_TRANSITO'
  | 'NAO_PADRONIZADO'

export type CaseMode = 'REUNIAO' | 'EMERGENCIA'

export type InkZoneStatus = 'AZUL' | 'VERMELHA' | 'OUTRA' | 'NAO_IDENTIFICADA'

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
  pageIndex?: number | null
  pageCount?: number | null
  upperInk?: InkZoneStatus | null
  lowerInk?: InkZoneStatus | null
  suggestedName: string | null
  confidence: number | null
  prontuarioConfidence?: number | null
  numeroDocumentoConfidence?: number | null
  prontuarioOcrSource?: 'TESSERACT' | 'PADDLE' | 'CONSENSUS' | 'MANUAL' | null
  numeroDocumentoOcrSource?: 'TESSERACT' | 'MANUAL' | null
  manualReviewApproved?: boolean
  rotationDegrees?: 0 | 90 | 180 | 270
  reviewStatus: ReviewStatus
  validations: DocumentValidation[]
  renameState?: RenameState
  lastRenameError?: string | null
}
