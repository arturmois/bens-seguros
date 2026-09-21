import { POLICY_BRANCH_LABELS } from '@/features/policies/lib/constants'
import type { PolicyBranch } from '@/features/policies/lib/types'

interface EndorsementPolicySummaryProps {
  readonly policyNumber: string
  readonly clientName?: string | null
  readonly branch: PolicyBranch
}

export function EndorsementPolicySummary({
  policyNumber,
  clientName,
  branch,
}: EndorsementPolicySummaryProps) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 px-4 py-3">
      <div>
        <p className="text-muted-foreground text-xs uppercase tracking-wide">
          Apólice de origem
        </p>
        <p className="font-medium">{policyNumber}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-wide">
            Cliente
          </p>
          <p className="font-medium">{clientName ?? 'Cliente não informado'}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs uppercase tracking-wide">
            Ramo
          </p>
          <p className="font-medium">{POLICY_BRANCH_LABELS[branch]}</p>
        </div>
      </div>
    </div>
  )
}
