'use client'

import { ProposalChecklistPanel } from '../../proposal-checklist-panel'

interface ChecklistTabProps {
  readonly proposalId: string
}

export function ChecklistTab({ proposalId }: ChecklistTabProps) {
  return <ProposalChecklistPanel proposalId={proposalId} />
}
