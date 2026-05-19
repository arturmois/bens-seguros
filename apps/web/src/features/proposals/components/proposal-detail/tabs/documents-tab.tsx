'use client'

import { DocumentList } from '@/features/documents/components/document-list'
import { DocumentUpload } from '@/features/documents/components/document-upload'

import type { ProposalData } from '../../../lib/constants'

interface DocumentsTabProps {
  readonly proposalId: string
  readonly branch: ProposalData['branch']
}

export function DocumentsTab({ proposalId, branch }: DocumentsTabProps) {
  return (
    <div className="space-y-4">
      <DocumentUpload
        entityType="PROPOSAL"
        entityId={proposalId}
        branch={branch}
      />
      <DocumentList entityType="PROPOSAL" entityId={proposalId} />
    </div>
  )
}
