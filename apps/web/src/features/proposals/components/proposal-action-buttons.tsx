import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

import type { ProposalStage } from '../types';

interface ProposalActionButtonsProps {
  stage: ProposalStage;
  onAdvance: () => void;
  onRevert: () => void;
  onLost: () => void;
  isAdvancing: boolean;
  isReverting: boolean;
}

export function ProposalActionButtons({
  stage,
  onAdvance,
  onRevert,
  onLost,
  isAdvancing,
  isReverting,
}: ProposalActionButtonsProps) {
  const canAdvance = stage !== 'POLICY_ISSUED' && stage !== 'LOST';
  const canRevert = stage !== 'CAPTURE' && stage !== 'LOST' && stage !== 'POLICY_ISSUED';
  const canMarkLost = stage !== 'LOST' && stage !== 'POLICY_ISSUED';

  return (
    <>
      {canAdvance && (
        <Button size="sm" variant="outline" onClick={onAdvance} disabled={isAdvancing}>
          {isAdvancing ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Avançar'}
        </Button>
      )}
      {canRevert && (
        <Button size="sm" variant="outline" onClick={onRevert} disabled={isReverting}>
          {isReverting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Reverter'}
        </Button>
      )}
      {canMarkLost && (
        <Button size="sm" variant="destructive" onClick={onLost}>
          Perda
        </Button>
      )}
    </>
  );
}
