import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

import type { ProposalStage } from '../lib/constants'

interface ProposalActionButtonsProps {
  stage: ProposalStage
  onAdvance: () => void
  onLost: () => void
  isAdvancing: boolean
}

export function ProposalActionButtons({
  stage,
  onAdvance,
  onLost,
  isAdvancing,
}: ProposalActionButtonsProps) {
  const canAdvance = stage !== 'POLICY_ISSUED' && stage !== 'LOST'
  const canMarkLost = stage !== 'LOST' && stage !== 'POLICY_ISSUED'
  return (
    <>
      {canAdvance && (
        <Button
          size="sm"
          variant="outline"
          onClick={onAdvance}
          disabled={isAdvancing}
        >
          {isAdvancing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            'Avançar'
          )}
        </Button>
      )}
      {canMarkLost && (
        <Button size="sm" variant="destructive" onClick={onLost}>
          Perda
        </Button>
      )}
    </>
  )
}
