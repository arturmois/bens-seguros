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

const createMutateMock = vi.fn()
const updateMutateMock = vi.fn()
vi.mock('../hooks/use-clients', () => ({
  useCreateClient: () => ({ mutate: createMutateMock, isPending: false }),
  useUpdateClient: () => ({ mutate: updateMutateMock, isPending: false }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import type { ClientDetail } from '../lib/types'
import { ClientForm } from './client-form'

const sampleClient = {
  id: 'client-42',
  organizationId: 'org-1',
  legalName: 'Maria Silva',
  document: '52998224725',
  personType: 'INDIVIDUAL',
  profession: 'Engenheira',
  maritalStatus: 'SINGLE',
  address: {
    cep: '01311000',
    street: 'Avenida Paulista',
    number: '1000',
    complement: null,
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
  },
  fiscalBirthDate: '1990-05-15T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  deletedAt: null,
  activePolicyCount: 0,
  totalPolicyCount: 0,
  contactCount: 0,
} as ClientDetail

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ClientForm (mode=create)', () => {
  it('renderiza Identificação, Perfil e Endereço como seções', () => {
    render(<ClientForm />)
    expect(
      screen.getByRole('heading', { level: 3, name: 'Identificação' })
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', { level: 3, name: 'Perfil' })
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', { level: 3, name: 'Endereço' })
    ).toBeTruthy()
  })

  it('mostra os campos de perfil', () => {
    render(<ClientForm />)
    expect(screen.getByLabelText('Profissão')).toBeTruthy()
    expect(screen.getByText('Estado civil')).toBeTruthy()
    expect(screen.getByText('Data de nascimento fiscal')).toBeTruthy()
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
      expect(createMutateMock).not.toHaveBeenCalled()
    })
  })

  it('redireciona para /clients/{id} ao sucesso (CPF válido)', async () => {
    createMutateMock.mockImplementation(
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
      expect(createMutateMock).toHaveBeenCalledTimes(1)
      expect(pushMock).toHaveBeenCalledWith('/clients/client-99')
    })
  })

  it('envia documento apenas com dígitos (strip da máscara)', async () => {
    createMutateMock.mockImplementation(
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
      const submitted = createMutateMock.mock.calls[0]?.[0] as Record<
        string,
        unknown
      >
      expect(submitted.document).toBe('52998224725')
    })
  })

  it('chama onSuccess callback ao invés de router.push quando passado', async () => {
    createMutateMock.mockImplementation(
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
    createMutateMock.mockImplementation(
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

describe('ClientForm (mode=edit)', () => {
  it('popula campos a partir do initial', () => {
    render(<ClientForm mode="edit" initial={sampleClient} />)
    expect(
      (screen.getByLabelText(/Nome completo/i) as HTMLInputElement).value
    ).toBe('Maria Silva')
    expect((screen.getByLabelText('Profissão') as HTMLInputElement).value).toBe(
      'Engenheira'
    )
    expect(screen.getByDisplayValue('15/05/1990')).toBeTruthy()
  })

  it('desabilita CPF/CNPJ em modo edit', () => {
    render(<ClientForm mode="edit" initial={sampleClient} />)
    expect((screen.getByLabelText(/CPF/i) as HTMLInputElement).disabled).toBe(
      true
    )
  })

  it('botão muda label para "Salvar alterações"', () => {
    render(<ClientForm mode="edit" initial={sampleClient} />)
    expect(
      screen.getByRole('button', { name: /Salvar alterações/i })
    ).toBeTruthy()
  })

  it('submit chama useUpdateClient sem document nem personType', async () => {
    updateMutateMock.mockImplementation(
      (_args: unknown, opts: { onSuccess?: () => void }) => {
        opts.onSuccess?.()
      }
    )
    render(<ClientForm mode="edit" initial={sampleClient} />)
    fireEvent.change(screen.getByLabelText(/Nome completo/i), {
      target: { value: 'Maria Atualizada' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Salvar alterações/i }))
    await waitFor(() => {
      expect(updateMutateMock).toHaveBeenCalledTimes(1)
    })
    const args = updateMutateMock.mock.calls[0]?.[0] as {
      id: string
      data: Record<string, unknown>
    }
    expect(args.id).toBe('client-42')
    expect(args.data.legalName).toBe('Maria Atualizada')
    expect(args.data).not.toHaveProperty('document')
    expect(args.data).not.toHaveProperty('personType')
  })

  it('redireciona para /clients/{id} ao sucesso em edit', async () => {
    updateMutateMock.mockImplementation(
      (_args: unknown, opts: { onSuccess?: () => void }) => {
        opts.onSuccess?.()
      }
    )
    render(<ClientForm mode="edit" initial={sampleClient} />)
    fireEvent.click(screen.getByRole('button', { name: /Salvar alterações/i }))
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/clients/client-42')
    })
  })
})
