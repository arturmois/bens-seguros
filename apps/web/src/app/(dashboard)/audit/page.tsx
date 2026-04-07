import type { Metadata } from 'next'
import { AuditContent } from '@/features/audit/components/audit-content'

export const metadata: Metadata = { title: 'Auditoria' }

export default function AuditPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Auditoria</h1>
        <p className="text-muted-foreground text-sm">
          Registro de atividades e alterações da organização.
        </p>
      </div>
      <AuditContent />
    </div>
  )
}
