'use client'

import { Tabs, TabsContent, TabsList, TabsTab } from '@/components/ui/tabs'
import { DocumentList } from '@/features/documents/components/document-list'
import { DocumentUpload } from '@/features/documents/components/document-upload'

import type { ProposalData } from '../../../lib/constants'
import { ProposalChecklistPanel } from '../../proposal-checklist-panel'

interface DocumentsTabSectionProps {
  readonly proposalId: string
  readonly branch: ProposalData['branch']
}

export function DocumentsTabSection({
  proposalId,
  branch,
}: DocumentsTabSectionProps) {
  return (
    <Tabs defaultValue="checklist">
      <TabsList>
        <TabsTab value="checklist">Checklist</TabsTab>
        <TabsTab value="documents">Documentos</TabsTab>
      </TabsList>
      <TabsContent value="checklist" className="mt-4">
        <ProposalChecklistPanel proposalId={proposalId} />
      </TabsContent>
      <TabsContent value="documents" className="mt-4 space-y-4">
        <DocumentUpload
          entityType="PROPOSAL"
          entityId={proposalId}
          branch={branch}
        />
        <DocumentList entityType="PROPOSAL" entityId={proposalId} />
      </TabsContent>
    </Tabs>
  )
}
