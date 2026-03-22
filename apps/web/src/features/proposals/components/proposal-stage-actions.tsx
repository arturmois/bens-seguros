'use client'

import { ChevronRight, Loader2, RotateCcw, XCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ProposalStageActionsProps {
  canAdvance: boolean
  canRevert: boolean
  canMarkLost: boolean
  checklistBlocking: boolean
  advancePending: boolean
  revertPending: boolean
  onAdvance: () => void
  onRevert: () => void
  onMarkLost: () => void
}

export function ProposalStageActions({
  canAdvance,
  canRevert,
  canMarkLost,
  checklistBlocking,
  advancePending,
  revertPending,
  onAdvance,
  onRevert,
  onMarkLost,
}: ProposalStageActionsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {canAdvance && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  onClick={onAdvance}
                  disabled={advancePending || checklistBlocking}
                  variant="default"
                >
                  {advancePending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ChevronRight className="mr-2 h-4 w-4" />
                  )}
                  Avancar Estagio
                </Button>
              </span>
            </TooltipTrigger>
            {checklistBlocking && (
              <TooltipContent side="top">
                Complete os itens obrigatorios do checklist
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      )}
      {canRevert && (
        <Button variant="outline" onClick={onRevert} disabled={revertPending}>
          {revertPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="mr-2 h-4 w-4" />
          )}
          Reverter
        </Button>
      )}
      {canMarkLost && (
        <Button variant="destructive" onClick={onMarkLost}>
          <XCircle className="mr-2 h-4 w-4" />
          Marcar como Perda
        </Button>
      )}
    </div>
  )
}
