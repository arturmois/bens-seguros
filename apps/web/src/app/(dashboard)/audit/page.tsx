import { AuditContent } from '@/features/audit/components/audit-content'

export default function AuditPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Auditoria</h1>
      <AuditContent />
    </div>
  )
}
