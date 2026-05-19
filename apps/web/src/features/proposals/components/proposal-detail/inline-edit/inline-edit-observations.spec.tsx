// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mutate = vi.fn()
vi.mock('../../../hooks/use-proposals', () => ({
  useUpdateProposalObservations: () => ({ mutate, isPending: false }),
}))

import { InlineEditObservations } from './inline-edit-observations'

function renderInline(initialValue: string | null) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <InlineEditObservations proposalId="p1" initialValue={initialValue} />
    </QueryClientProvider>
  )
}

afterEach(() => {
  cleanup()
  mutate.mockReset()
})

describe('InlineEditObservations', () => {
  it('mostra texto inicial em read mode', () => {
    renderInline('texto inicial')
    expect(screen.getByText('texto inicial')).toBeTruthy()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('mostra placeholder quando vazio', () => {
    renderInline(null)
    expect(screen.getByText(/Nenhuma observação/)).toBeTruthy()
  })

  it('click no texto entra em edit mode', async () => {
    const user = userEvent.setup()
    renderInline('hello')
    await user.click(screen.getByText('hello'))
    expect(screen.getByRole('textbox')).toBeTruthy()
    const saveBtn = screen.getByRole('button', {
      name: /Salvar/,
    }) as HTMLButtonElement
    expect(saveBtn.disabled).toBe(true)
  })

  it('digita e habilita Salvar', async () => {
    const user = userEvent.setup()
    renderInline('hello')
    await user.click(screen.getByText('hello'))
    const textarea = screen.getByRole('textbox')
    await user.type(textarea, ' world')
    const saveBtn = screen.getByRole('button', {
      name: /Salvar/,
    }) as HTMLButtonElement
    expect(saveBtn.disabled).toBe(false)
  })

  it('Cancelar restaura ao valor inicial e sai do edit mode', async () => {
    const user = userEvent.setup()
    renderInline('hello')
    await user.click(screen.getByText('hello'))
    const textarea = screen.getByRole('textbox')
    await user.clear(textarea)
    await user.type(textarea, 'changed')
    await user.click(screen.getByRole('button', { name: /Cancelar/ }))
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.getByText('hello')).toBeTruthy()
  })

  it('Salvar dispara mutation com observations digitadas', async () => {
    const user = userEvent.setup()
    mutate.mockImplementation((_vars, opts) => opts?.onSuccess?.())
    renderInline('hello')
    await user.click(screen.getByText('hello'))
    const textarea = screen.getByRole('textbox')
    await user.type(textarea, ' world')
    await user.click(screen.getByRole('button', { name: /Salvar/ }))
    expect(mutate).toHaveBeenCalledWith(
      { id: 'p1', observations: 'hello world' },
      expect.any(Object)
    )
  })
})
