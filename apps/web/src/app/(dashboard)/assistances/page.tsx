import { AssistancesContent } from './assistances-content'

export default function AssistancesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assistencias</h1>
        <p className="text-muted-foreground text-sm">
          Gerenciamento de assistencias e acompanhamento de prestadores.
        </p>
      </div>
      <AssistancesContent />
    </div>
  )
}
