'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTab } from '@/components/ui/tabs'

import { OccurrenceForm } from './occurrence-form'

interface ClaimTabsProps {
  readonly claimId: string
  readonly occurrencesSlot: React.ReactNode
  readonly documentsSlot: React.ReactNode
}

export function ClaimTabs({
  claimId,
  occurrencesSlot,
  documentsSlot,
}: ClaimTabsProps) {
  const [occurrenceFormOpen, setOccurrenceFormOpen] = useState(false)
  return (
    <>
      <Tabs defaultValue="occurrences">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <TabsList variant="underline">
            <TabsTab value="occurrences">Ocorrências</TabsTab>
            <TabsTab value="documents">Documentos</TabsTab>
          </TabsList>
          <Button
            className="w-full sm:w-auto"
            onClick={() => setOccurrenceFormOpen(true)}
          >
            <Plus className="mr-1 h-4 w-4" />
            Nova Ocorrência
          </Button>
        </div>
        <TabsContent value="occurrences" className="mt-6">
          {occurrencesSlot}
        </TabsContent>
        <TabsContent value="documents" className="mt-6 space-y-4">
          {documentsSlot}
        </TabsContent>
      </Tabs>
      <OccurrenceForm
        claimId={claimId}
        open={occurrenceFormOpen}
        onOpenChange={setOccurrenceFormOpen}
      />
    </>
  )
}
