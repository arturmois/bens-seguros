'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTab } from '@/components/ui/tabs'

import { DocumentList } from '@/features/documents/components/document-list'
import { DocumentUpload } from '@/features/documents/components/document-upload'
import { EndorsementForm } from '@/features/endorsements/components/endorsement-form'
import { EndorsementList } from '@/features/endorsements/components/endorsement-list'

interface PolicyTabsProps {
  readonly policyId: string
}

export function PolicyTabs({ policyId }: PolicyTabsProps) {
  const [endorsementFormOpen, setEndorsementFormOpen] = useState(false)
  return (
    <>
      <Tabs defaultValue="endorsements">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <TabsList variant="underline">
            <TabsTab value="endorsements">Registros de Endosso</TabsTab>
            <TabsTab value="documents">Documentos</TabsTab>
          </TabsList>
          <Button
            className="w-full sm:w-auto"
            onClick={() => setEndorsementFormOpen(true)}
          >
            <Plus className="mr-1 h-4 w-4" />
            Registrar Endosso Histórico
          </Button>
        </div>
        <TabsContent value="endorsements" className="mt-6">
          <EndorsementList policyId={policyId} />
        </TabsContent>
        <TabsContent value="documents" className="mt-6 space-y-4">
          <DocumentUpload entityType="POLICY" entityId={policyId} />
          <DocumentList entityType="POLICY" entityId={policyId} />
        </TabsContent>
      </Tabs>
      <EndorsementForm
        policyId={policyId}
        open={endorsementFormOpen}
        onOpenChange={setEndorsementFormOpen}
      />
    </>
  )
}
