import { Tabs, TabsContent, TabsList, TabsTab } from '@/components/ui/tabs'

interface AssistanceTabsProps {
  readonly documentsSlot: React.ReactNode
}

export function AssistanceTabs({ documentsSlot }: AssistanceTabsProps) {
  return (
    <Tabs defaultValue="documents">
      <TabsList variant="underline">
        <TabsTab value="documents">Documentos</TabsTab>
      </TabsList>
      <TabsContent value="documents" className="mt-6 space-y-4">
        {documentsSlot}
      </TabsContent>
    </Tabs>
  )
}
