'use client'

import { AssistanceDetail } from '@/features/assistances/components/assistance-detail'

interface AssistanceDetailContentProps {
  readonly assistanceId: string
}

export function AssistanceDetailContent({
  assistanceId,
}: AssistanceDetailContentProps) {
  return <AssistanceDetail assistanceId={assistanceId} />
}
