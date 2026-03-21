'use client';

import { CommissionDetail } from '@/features/commissions/components/commission-detail';

interface CommissionDetailContentProps {
  readonly commissionId: string;
}

export function CommissionDetailContent({ commissionId }: CommissionDetailContentProps) {
  return <CommissionDetail commissionId={commissionId} />;
}
