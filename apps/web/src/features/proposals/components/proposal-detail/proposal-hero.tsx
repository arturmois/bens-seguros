'use client'

import {
  ChevronRight,
  ExternalLink,
  FileText,
  Loader2,
  MoreHorizontal,
  Send,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/menu'

import { formatCurrency, formatPercentage } from '@/lib/formatters'

import type { ProposalData, ProposalStage } from '../../lib/constants'
import {
  BOARD_TYPE_LABELS,
  BRANCH_LABELS,
  STAGE_LABELS,
} from '../../lib/constants'
import { StageTracker } from './stage-tracker'

interface ProposalHeroProps {
  readonly proposal: ProposalData
  readonly pdfPending: boolean
  readonly sendQuotePending: boolean
  readonly advancePending: boolean
  readonly checklistBlocking: boolean
  readonly existingPolicyId?: string | null
  readonly onGeneratePdf: () => void
  readonly onSendQuote: () => void
  readonly onAdvance: () => void
  readonly onMarkLost: () => void
}

type HeroVariant = 'default' | 'lost' | 'success'

const VARIANT_ACCENT: Record<HeroVariant, string> = {
  default: 'bg-primary',
  lost: 'bg-destructive',
  success: 'bg-success',
}

function pickVariant(stage: ProposalStage): HeroVariant {
  if (stage === 'LOST') return 'lost'
  if (stage === 'POLICY_ISSUED') return 'success'
  return 'default'
}

export function ProposalHero({
  proposal,
  pdfPending,
  sendQuotePending,
  advancePending,
  checklistBlocking,
  existingPolicyId,
  onGeneratePdf,
  onSendQuote,
  onAdvance,
  onMarkLost,
}: ProposalHeroProps) {
  const variant = pickVariant(proposal.stage)
  const isTerminal =
    proposal.stage === 'LOST' || proposal.stage === 'POLICY_ISSUED'
  const showSendQuote = !isTerminal && proposal.stage !== 'CAPTURE'
  const showAdvance = !isTerminal
  const showViewPolicy =
    proposal.stage === 'POLICY_ISSUED' && Boolean(existingPolicyId)
  const canMarkLost = !isTerminal
  const premiumDisplay = formatCurrency(proposal.premiumValueInCents)
  const commissionPctDisplay = formatPercentage(
    proposal.commissionPercentageInCents
  )
  const commissionValue = formatCurrency(
    Math.round(
      (proposal.premiumValueInCents * proposal.commissionPercentageInCents) /
        10000
    )
  )
  const idTag = proposal.id.slice(0, 8).toUpperCase()

  return (
    <section
      data-testid="proposal-hero"
      data-variant={variant}
      className="bg-card text-card-foreground shadow-xs relative overflow-hidden rounded-xl border"
    >
      <div className={`h-1 w-full ${VARIANT_ACCENT[variant]}`} aria-hidden />
      <div className="p-4 sm:p-6">
        <div className="mb-4">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {proposal.clientName ?? 'Cliente'}
            {variant === 'success' && (
              <span className="text-success ml-2">✓</span>
            )}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="secondary">{BRANCH_LABELS[proposal.branch]}</Badge>
            <Badge variant="secondary">
              {BOARD_TYPE_LABELS[proposal.boardType]}
            </Badge>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground font-mono text-xs">
              {idTag}
            </span>
          </div>
        </div>

        <div className="my-5">
          <div className="block sm:hidden">
            <StageTracker
              currentStage={proposal.stage}
              variant={variant}
              hideLabels
            />
            <p className="text-foreground mt-2 text-xs font-semibold">
              {STAGE_LABELS[proposal.stage]}
            </p>
          </div>
          <div className="hidden sm:block">
            <StageTracker currentStage={proposal.stage} variant={variant} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t pt-4 sm:gap-6">
          <div className="flex flex-col">
            <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
              Prêmio
            </span>
            <span className="text-base font-bold tabular-nums sm:text-lg">
              {premiumDisplay}
            </span>
          </div>
          <div className="bg-border hidden h-8 w-px sm:block" />
          <div className="flex flex-col">
            <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
              Comissão
            </span>
            <span className="text-base font-bold tabular-nums sm:text-lg">
              {commissionPctDisplay}
              <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                {commissionValue}
              </span>
            </span>
          </div>
          <div className="bg-border hidden h-8 w-px sm:block" />
          <div className="hidden flex-col sm:flex">
            <span className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
              Vendedor
            </span>
            <span className="text-sm font-semibold">
              {proposal.salespersonName ?? '—'}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onGeneratePdf}
              disabled={pdfPending}
            >
              {pdfPending ? (
                <Loader2 className="size-4 animate-spin sm:mr-1.5" />
              ) : (
                <FileText className="size-4 sm:mr-1.5" />
              )}
              <span className="hidden sm:inline">PDF</span>
            </Button>
            {showSendQuote && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSendQuote}
                disabled={sendQuotePending}
              >
                {sendQuotePending ? (
                  <Loader2 className="size-4 animate-spin sm:mr-1.5" />
                ) : (
                  <Send className="size-4 sm:mr-1.5" />
                )}
                <span className="hidden sm:inline">Enviar Cotação</span>
              </Button>
            )}
            {showAdvance && (
              <Button
                size="sm"
                onClick={onAdvance}
                disabled={advancePending || checklistBlocking}
                title={
                  checklistBlocking
                    ? 'Complete os itens obrigatórios do checklist'
                    : undefined
                }
              >
                {advancePending ? (
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                ) : (
                  <ChevronRight className="mr-1.5 size-4" />
                )}
                Avançar
              </Button>
            )}
            {showViewPolicy && existingPolicyId && (
              <Button
                size="sm"
                render={<Link href={`/policies/${existingPolicyId}`} />}
              >
                <ExternalLink className="mr-1.5 size-4" />
                Ver Apólice
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="Mais ações"
                  />
                }
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canMarkLost && (
                  <DropdownMenuItem
                    onClick={onMarkLost}
                    className="text-destructive"
                  >
                    <XCircle className="mr-2 size-4" />
                    Marcar como Perda
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </section>
  )
}
