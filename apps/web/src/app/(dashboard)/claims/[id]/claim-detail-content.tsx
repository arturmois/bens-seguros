'use client';

import { ClaimDetail } from '@/features/claims/components/claim-detail';

interface ClaimDetailContentProps {
  readonly claimId: string;
}

export function ClaimDetailContent({ claimId }: ClaimDetailContentProps) {
  return <ClaimDetail claimId={claimId} />;
}
