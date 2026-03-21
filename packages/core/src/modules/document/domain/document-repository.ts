export type DocumentEntityType = 'CLIENT' | 'PROPOSAL' | 'POLICY' | 'CLAIM' | 'ASSISTANCE';

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
  id: string;
  organizationId: string;
  entityType: DocumentEntityType;
  entityId: string;
  clientId: string | null;
  type: DocumentType;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  url: string | null;
  createdBy: string | null;
  createdAt: Date;
}

export interface DocumentFilters {
  organizationId: string;
  entityType?: DocumentEntityType;
  entityId?: string;
}

export interface CreateDocumentInput {
  organizationId: string;
  entityType: DocumentEntityType;
  entityId: string;
  clientId?: string;
  type?: DocumentType;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  url?: string;
  createdBy?: string;
}

export interface DocumentRepository {
  create(data: CreateDocumentInput): Promise<DocumentData>;
  findById(id: string, organizationId: string): Promise<DocumentData | null>;
  findByEntity(
    entityType: DocumentEntityType,
    entityId: string,
    organizationId: string,
  ): Promise<DocumentData[]>;
  delete(id: string, organizationId: string): Promise<DocumentData | null>;
}
