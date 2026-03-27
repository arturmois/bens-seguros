'use client'

import { ChevronRight, Loader2, XCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ProposalStageActionsProps {
  canAdvance: boolean
  canMarkLost: boolean
  checklistBlocking: boolean
  advancePending: boolean
  onAdvance: () => void
  onMarkLost: () => void
}

export function ProposalStageActions({
  canAdvance,
  canMarkLost,
  checklistBlocking,
  advancePending,
  onAdvance,
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
                  Avançar Estágio
                </Button>
              </span>
            </TooltipTrigger>
            {checklistBlocking && (
              <TooltipContent side="top">
                Complete os itens obrigatórios do checklist
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
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
