'use client';

import { ProposalDetail } from '@/features/proposals/components/proposal-detail';

interface ProposalDetailContentProps {
  proposalId: string;
}

export function ProposalDetailContent({ proposalId }: ProposalDetailContentProps) {
  return <ProposalDetail proposalId={proposalId} />;
}
