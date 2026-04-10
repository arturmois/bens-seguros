import type { Metadata } from 'next'
import { AssistancesContent } from './assistances-content'

export const metadata: Metadata = { title: 'Assistências' }

export default function AssistancesPage() {
  return (
    <div className="flex h-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assistências</h1>
        <p className="text-muted-foreground text-sm">
          Gerenciamento de assistências e acompanhamento de prestadores.
        </p>
      </div>
      <AssistancesContent />
    </div>
  )
}
