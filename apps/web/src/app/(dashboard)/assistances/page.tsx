import { AssistancesContent } from './assistances-content'

export default function AssistancesPage() {
  return (
    <div className="space-y-6">
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
