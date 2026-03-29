import type { DocumentEntityType, DocumentType } from '../types'

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  DRIVER_LICENSE: 'CNH',
  VEHICLE_REGISTRATION: 'CRLV',
  HEALTH_DECLARATION: 'Declaração de Saúde',
  PROOF_OF_ADDRESS: 'Comprovante de Endereço',
  SOCIAL_CONTRACT: 'Contrato Social',
  CNPJ_CARD: 'Cartão CNPJ',
  POLICY_PDF: 'Apólice PDF',
  QUOTATION_PDF: 'Cotação PDF',
  CLAIM_PHOTO: 'Foto Sinistro',
  CLAIM_REPORT: 'Laudo Sinistro',
  PROOF_OF_PAYMENT: 'Comprovante Pagamento',
  CONTRACT: 'Contrato',
  OTHER: 'Outro',
}

export const DOCUMENT_ENTITY_TYPE_LABELS: Record<DocumentEntityType, string> = {
  CLIENT: 'Cliente',
  PROPOSAL: 'Proposta',
  POLICY: 'Apólice',
  CLAIM: 'Sinistro',
  ASSISTANCE: 'Assistência',
}
