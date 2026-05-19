// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ProposalHero } from './proposal-hero'
import type { ProposalData } from '../../lib/constants'

const baseProposal = {
  id: 'p1abc12345',
  organizationId: 'o1',
  contactId: 'c1',
  clientName: 'João Silva',
  clientDocument: '123.456.789-00',
  clientPersonType: 'NATURAL',
  salespersonId: 's1',
  salespersonName: 'Carlos M.',
  branch: 'AUTO',
  boardType: 'NEW_INSURANCE',
  stage: 'QUOTE',
  premiumValueInCents: 248000,
  commissionPercentageInCents: 1500,
  observations: null,
  details: null,
  coverageStartDate: null,
  coverageEndDate: null,
  quoteValidUntil: null,
  sentToClientAt: null,
  clientResponseAt: null,
  lostReason: null,
  endorsementType: null,
  endorsementReason: null,
  sourcePolicyId: null,
  sourcePolicySnapshot: null,
  renewalPolicyId: null,
  renewalPolicyNumber: null,
  createdAt: '2026-05-10T14:22:00Z',
  updatedAt: '2026-05-14T09:14:00Z',
} as unknown as ProposalData

function setup(overrides: Partial<ProposalData> = {}) {
  const onGeneratePdf = vi.fn()
  const onSendQuote = vi.fn()
  const onAdvance = vi.fn()
  const onMarkLost = vi.fn()
  render(
    <ProposalHero
      proposal={{ ...baseProposal, ...overrides }}
      pdfPending={false}
      sendQuotePending={false}
      advancePending={false}
      checklistBlocking={false}
      onGeneratePdf={onGeneratePdf}
      onSendQuote={onSendQuote}
      onAdvance={onAdvance}
      onMarkLost={onMarkLost}
    />
  )
  return { onGeneratePdf, onSendQuote, onAdvance, onMarkLost }
}

afterEach(() => {
  cleanup()
})

describe('ProposalHero', () => {
  it('renderiza nome do cliente, branch e board type', () => {
    setup()
    expect(
      screen.getByRole('heading', { level: 1, name: /João Silva/ })
    ).toBeTruthy()
    expect(screen.getByText('Auto')).toBeTruthy()
    expect(screen.getByText('Novo Seguro')).toBeTruthy()
  })

  it('renderiza KPIs Prêmio, Comissão e Vendedor', () => {
    setup()
    expect(screen.getByText(/R\$\s?2\.480,00/)).toBeTruthy()
    expect(screen.getByText(/15\.0%/)).toBeTruthy()
    expect(screen.getByText('Carlos M.')).toBeTruthy()
  })

  it('dispara onAdvance quando "Avançar" é clicado', async () => {
    const user = userEvent.setup()
    const { onAdvance } = setup()
    await user.click(screen.getByRole('button', { name: /Avançar/ }))
    expect(onAdvance).toHaveBeenCalledTimes(1)
  })

  it('Avançar fica desabilitado quando checklistBlocking=true', () => {
    render(
      <ProposalHero
        proposal={baseProposal}
        pdfPending={false}
        sendQuotePending={false}
        advancePending={false}
        checklistBlocking={true}
        onGeneratePdf={vi.fn()}
        onSendQuote={vi.fn()}
        onAdvance={vi.fn()}
        onMarkLost={vi.fn()}
      />
    )
    const btn = screen.getByRole('button', {
      name: /Avançar/,
    }) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it('em estado LOST, esconde "Avançar" e marca variant="lost"', () => {
    setup({
      stage: 'LOST',
      lostReason: 'Concorrência',
    } as Partial<ProposalData>)
    expect(screen.queryByRole('button', { name: /Avançar/ })).toBeNull()
    expect(
      screen.getByTestId('proposal-hero').getAttribute('data-variant')
    ).toBe('lost')
  })

  it('em estado POLICY_ISSUED, marca variant="success"', () => {
    setup({ stage: 'POLICY_ISSUED' } as Partial<ProposalData>)
    expect(screen.queryByRole('button', { name: /Avançar/ })).toBeNull()
    expect(
      screen.getByTestId('proposal-hero').getAttribute('data-variant')
    ).toBe('success')
  })

  it('em CAPTURE stage, "Enviar Cotação" não aparece', () => {
    setup({ stage: 'CAPTURE' } as Partial<ProposalData>)
    expect(screen.queryByRole('button', { name: /Enviar/ })).toBeNull()
  })

  it('renderiza overflow button com aria-label "Mais ações"', () => {
    setup()
    expect(screen.getByRole('button', { name: /Mais ações/ })).toBeTruthy()
  })
})
