'use client';

import { PolicyDetail } from '@/features/policies/components/policy-detail';

interface PolicyDetailContentProps {
  policyId: string;
}

export function PolicyDetailContent({ policyId }: PolicyDetailContentProps) {
  return <PolicyDetail policyId={policyId} />;
}
