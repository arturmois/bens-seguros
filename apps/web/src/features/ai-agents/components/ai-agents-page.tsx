import { AiAgentsTable } from './ai-agents-table'

export function AiAgentsPage() {
  return (
    <div className="flex h-full flex-col gap-6">
      <div>
        <h2 className="font-semibold text-lg tracking-tight">Agentes de IA</h2>
        <p className="text-muted-foreground text-sm">
          Gerencie seus agentes de IA para automatizar atendimentos.
        </p>
      </div>
      <AiAgentsTable />
    </div>
  )
}
