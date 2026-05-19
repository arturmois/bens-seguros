'use client'

import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTab } from '@/components/ui/tabs'

interface ProposalTabsProps {
  readonly checklistRequired: number
  readonly checklistCompleted: number
  readonly checklistHasPending: boolean
  readonly documentsCount: number
  readonly overviewSlot: React.ReactNode
  readonly insuredObjectSlot: React.ReactNode
  readonly checklistSlot: React.ReactNode
  readonly documentsSlot: React.ReactNode
}

export function ProposalTabs({
  checklistRequired,
  checklistCompleted,
  checklistHasPending,
  documentsCount,
  overviewSlot,
  insuredObjectSlot,
  checklistSlot,
  documentsSlot,
}: ProposalTabsProps) {
  return (
    <Tabs defaultValue="overview">
      <TabsList variant="underline">
        <TabsTab value="overview">Visão Geral</TabsTab>
        <TabsTab value="insured-object">Bem Segurado</TabsTab>
        <TabsTab value="checklist">
          Checklist
          {checklistRequired > 0 && (
            <Badge
              variant={checklistHasPending ? 'warning' : 'secondary'}
              size="sm"
              className="ml-1"
            >
              {checklistCompleted}/{checklistRequired}
            </Badge>
          )}
        </TabsTab>
        <TabsTab value="documents">
          Documentos
          {documentsCount > 0 && (
            <Badge variant="secondary" size="sm" className="ml-1">
              {documentsCount}
            </Badge>
          )}
        </TabsTab>
      </TabsList>
      <TabsContent value="overview" className="mt-6">
        {overviewSlot}
      </TabsContent>
      <TabsContent value="insured-object" className="mt-6">
        {insuredObjectSlot}
      </TabsContent>
      <TabsContent value="checklist" className="mt-6">
        {checklistSlot}
      </TabsContent>
      <TabsContent value="documents" className="mt-6">
        {documentsSlot}
      </TabsContent>
    </Tabs>
  )
}
