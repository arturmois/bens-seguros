import { InsurersTable } from './insurers-table'

export function InsurersPage() {
  return (
    <div className="flex h-full flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Seguradoras</h1>
        <p className="text-muted-foreground text-sm">
          Gerencie as seguradoras disponíveis para propostas, apólices e
          sinistros.
        </p>
      </div>

      <InsurersTable />
    </div>
  )
}
