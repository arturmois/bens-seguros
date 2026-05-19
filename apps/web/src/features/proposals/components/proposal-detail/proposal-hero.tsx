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

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/menu'

import { formatCurrency, formatPercentage } from '@/lib/formatters'

import {
  BOARD_TYPE_LABELS,
  BRANCH_LABELS,
  STAGE_LABELS,
} from '../../lib/constants'
import type { ProposalData, ProposalStage } from '../../lib/constants'
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

const VARIANT_BG: Record<HeroVariant, string> = {
  default: 'from-primary to-primary/85',
  lost: 'from-destructive to-destructive/85',
  success: 'from-success to-success/85',
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
      className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${VARIANT_BG[variant]} p-4 text-white shadow-lg sm:p-6`}
    >
      <div className="mb-4">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          {proposal.clientName ?? 'Cliente'}
          {variant === 'success' && (
            <span className="ml-2 text-emerald-200">✓</span>
          )}
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-white/80">
          <span className="inline-flex items-center rounded-full border border-white/20 bg-white/15 px-2.5 py-0.5 text-xs font-semibold">
            {BRANCH_LABELS[proposal.branch]}
          </span>
          <span className="inline-flex items-center rounded-full border border-white/20 bg-white/15 px-2.5 py-0.5 text-xs font-semibold">
            {BOARD_TYPE_LABELS[proposal.boardType]}
          </span>
          <span className="text-white/50">·</span>
          <span className="font-mono text-xs">{idTag}</span>
        </div>
      </div>

      <div className="my-5">
        <div className="block sm:hidden">
          <StageTracker
            currentStage={proposal.stage}
            variant={variant}
            hideLabels
          />
          <p className="mt-2 text-xs font-semibold text-white/90">
            {STAGE_LABELS[proposal.stage]}
          </p>
        </div>
        <div className="hidden sm:block">
          <StageTracker currentStage={proposal.stage} variant={variant} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-4 sm:gap-6">
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
            Prêmio
          </span>
          <span className="text-base font-bold tabular-nums sm:text-lg">
            {premiumDisplay}
          </span>
        </div>
        <div className="hidden h-8 w-px bg-white/10 sm:block" />
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
            Comissão
          </span>
          <span className="text-base font-bold tabular-nums sm:text-lg">
            {commissionPctDisplay}
            <span className="ml-1.5 text-xs font-normal text-white/65">
              {commissionValue}
            </span>
          </span>
        </div>
        <div className="hidden h-8 w-px bg-white/10 sm:block" />
        <div className="hidden flex-col sm:flex">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
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
            className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
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
              className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
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
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
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
              className="bg-primary-foreground text-success hover:bg-primary-foreground/90"
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
                  className="border-white/20 bg-white/10 text-white hover:bg-white/20"
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
    </section>
  )
}
