// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mutateMock = vi.fn()
vi.mock('../hooks/use-proposals', () => ({
  useUpdateProposalObservations: () => ({
    mutate: mutateMock,
    isPending: false,
  }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { ProposalObservations } from './proposal-observations'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('<ProposalObservations />', () => {
  it('renders initial value in textarea', () => {
    render(
      <ProposalObservations proposalId="p1" initialValue="texto inicial" />
    )
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    expect(textarea.value).toBe('texto inicial')
  })
  it('disables Salvar when not dirty', () => {
    render(<ProposalObservations proposalId="p1" initialValue="texto" />)
    const save = screen.getByRole('button', {
      name: /salvar/i,
    }) as HTMLButtonElement
    expect(save.disabled).toBe(true)
  })
  it('enables Salvar after editing and calls mutate on click', () => {
    render(<ProposalObservations proposalId="p1" initialValue="" />)
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'novo' },
    })
    const save = screen.getByRole('button', {
      name: /salvar/i,
    }) as HTMLButtonElement
    expect(save.disabled).toBe(false)
    fireEvent.click(save)
    expect(mutateMock).toHaveBeenCalledWith({
      id: 'p1',
      observations: 'novo',
    })
  })
  it('saves null when textarea cleared to empty', () => {
    render(<ProposalObservations proposalId="p1" initialValue="x" />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }))
    expect(mutateMock).toHaveBeenCalledWith({ id: 'p1', observations: null })
  })
  it('shows character counter', () => {
    render(<ProposalObservations proposalId="p1" initialValue="abc" />)
    expect(screen.getByText('3/2000')).toBeTruthy()
  })
})
