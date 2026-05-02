import { Badge } from '@/components/ui/badge'

import { STAGE_LABELS } from '../lib/constants'
import { getStageColor } from '../lib/stage-derivation'
import type { ContactStage } from '../lib/types'

interface ContactStageBadgeProps {
  readonly stage: ContactStage
}

export function ContactStageBadge({ stage }: ContactStageBadgeProps) {
  return (
    <Badge className={getStageColor(stage)} variant="outline">
      {STAGE_LABELS[stage]}
    </Badge>
  )
}
