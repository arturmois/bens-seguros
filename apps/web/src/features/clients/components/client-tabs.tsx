'use client'

import { Tabs, TabsContent, TabsList, TabsTab } from '@/components/ui/tabs'

export const TAB_VALUES = [
  'propostas',
  'apolices',
  'contatos',
  'documentos',
  'historico',
] as const
export type TabValue = (typeof TAB_VALUES)[number]

interface ClientTabsProps {
  readonly activeTab: TabValue
  readonly onTabChange: (value: string) => void
  readonly propostasSlot: React.ReactNode
  readonly apolicesSlot: React.ReactNode
  readonly contatosSlot: React.ReactNode
  readonly documentosSlot: React.ReactNode
  readonly historicoSlot: React.ReactNode
}

export function ClientTabs({
  activeTab,
  onTabChange,
  propostasSlot,
  apolicesSlot,
  contatosSlot,
  documentosSlot,
  historicoSlot,
}: ClientTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange}>
      <TabsList variant="underline">
        <TabsTab value="propostas">Propostas</TabsTab>
        <TabsTab value="apolices">Apólices</TabsTab>
        <TabsTab value="contatos">Contatos</TabsTab>
        <TabsTab value="documentos">Documentos</TabsTab>
        <TabsTab value="historico">Histórico</TabsTab>
      </TabsList>
      <TabsContent value="propostas" className="mt-6">
        {propostasSlot}
      </TabsContent>
      <TabsContent value="apolices" className="mt-6">
        {apolicesSlot}
      </TabsContent>
      <TabsContent value="contatos" className="mt-6">
        {contatosSlot}
      </TabsContent>
      <TabsContent value="documentos" className="mt-6 space-y-4">
        {documentosSlot}
      </TabsContent>
      <TabsContent value="historico" className="mt-6">
        {historicoSlot}
      </TabsContent>
    </Tabs>
  )
}
