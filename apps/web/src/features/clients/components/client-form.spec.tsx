// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, back: vi.fn() }),
}))

const mutateMock = vi.fn()
vi.mock('../hooks/use-clients', () => ({
  useCreateClient: () => ({ mutate: mutateMock, isPending: false }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { ClientForm } from './client-form'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ClientForm (quick-create)', () => {
  it('renderiza apenas 3 campos (tipo, documento, nome)', () => {
    render(<ClientForm />)
    expect(screen.getByText(/Tipo/i)).toBeTruthy()
    expect(screen.getByLabelText(/CPF/i)).toBeTruthy()
    expect(screen.getByLabelText(/Nome completo/i)).toBeTruthy()
    expect(screen.queryByLabelText(/Profissão/i)).toBeNull()
    expect(screen.queryByText(/Estado civil/i)).toBeNull()
    expect(screen.queryByText(/Data de nascimento/i)).toBeNull()
    expect(screen.queryByLabelText(/CEP/i)).toBeNull()
  })
  it('bloqueia submit quando documento inválido', async () => {
    render(<ClientForm />)
    fireEvent.change(screen.getByLabelText(/CPF/i), {
      target: { value: '12345678901' },
    })
    fireEvent.change(screen.getByLabelText(/Nome completo/i), {
      target: { value: 'João Silva' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Criar cliente/i }))
    await waitFor(() => {
      expect(mutateMock).not.toHaveBeenCalled()
    })
  })
  it('redireciona para /clients/{id} ao sucesso (CPF válido)', async () => {
    mutateMock.mockImplementation(
      (_values: unknown, opts: { onSuccess?: (resp: unknown) => void }) => {
        opts.onSuccess?.({ data: { data: { id: 'client-99' } } })
      }
    )
    render(<ClientForm />)
    fireEvent.change(screen.getByLabelText(/CPF/i), {
      target: { value: '52998224725' },
    })
    fireEvent.change(screen.getByLabelText(/Nome completo/i), {
      target: { value: 'Maria Silva' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Criar cliente/i }))
    await waitFor(() => {
      expect(mutateMock).toHaveBeenCalledTimes(1)
      expect(pushMock).toHaveBeenCalledWith('/clients/client-99')
    })
  })
  it('envia documento apenas com dígitos (strip da máscara)', async () => {
    mutateMock.mockImplementation(
      (_values: unknown, opts: { onSuccess?: (resp: unknown) => void }) => {
        opts.onSuccess?.({ data: { data: { id: 'client-1' } } })
      }
    )
    render(<ClientForm />)
    fireEvent.change(screen.getByLabelText(/CPF/i), {
      target: { value: '529.982.247-25' },
    })
    fireEvent.change(screen.getByLabelText(/Nome completo/i), {
      target: { value: 'Maria Silva' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Criar cliente/i }))
    await waitFor(() => {
      const submitted = mutateMock.mock.calls[0]?.[0] as Record<string, unknown>
      expect(submitted.document).toBe('52998224725')
    })
  })
  it('chama onSuccess callback ao invés de router.push quando passado', async () => {
    mutateMock.mockImplementation(
      (_values: unknown, opts: { onSuccess?: (resp: unknown) => void }) => {
        opts.onSuccess?.({ data: { data: { id: 'client-7' } } })
      }
    )
    const onSuccess = vi.fn()
    render(<ClientForm onSuccess={onSuccess} />)
    fireEvent.change(screen.getByLabelText(/CPF/i), {
      target: { value: '52998224725' },
    })
    fireEvent.change(screen.getByLabelText(/Nome completo/i), {
      target: { value: 'Maria Silva' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Criar cliente/i }))
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith('client-7')
      expect(pushMock).not.toHaveBeenCalled()
    })
  })
  it('refoca o campo documento quando hook reporta duplicate', async () => {
    const { ApiError } = await import('@/lib/api-client')
    const duplicateError = new ApiError(
      409,
      'CLIENT_ALREADY_EXISTS',
      'Já existe',
      { existingClientId: 'client-42' }
    )
    mutateMock.mockImplementation(
      (_values: unknown, opts: { onError?: (error: unknown) => void }) => {
        opts.onError?.(duplicateError)
      }
    )
    render(<ClientForm />)
    const documentInput = screen.getByLabelText(/CPF/i) as HTMLInputElement
    fireEvent.change(documentInput, { target: { value: '52998224725' } })
    fireEvent.change(screen.getByLabelText(/Nome completo/i), {
      target: { value: 'Maria Silva' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Criar cliente/i }))
    await waitFor(() => {
      expect(document.activeElement).toBe(documentInput)
    })
  })
})
