export type DocumentEntityType = 'CLIENT' | 'PROPOSAL' | 'POLICY' | 'CLAIM';

export type DocumentType =
  | 'DRIVER_LICENSE'
  | 'VEHICLE_REGISTRATION'
  | 'POLICY_PDF'
  | 'CLAIM_PHOTO'
  | 'CLAIM_REPORT'
  | 'PROOF_OF_PAYMENT'
  | 'CONTRACT'
  | 'OTHER';

export interface DocumentData {
  readonly id: string;
  readonly organizationId: string;
  readonly entityType: DocumentEntityType;
  readonly entityId: string;
  readonly clientId: string | null;
  readonly type: DocumentType;
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly storageKey: string;
  readonly url: string | null;
  readonly createdBy: string | null;
  readonly createdAt: string;
}
