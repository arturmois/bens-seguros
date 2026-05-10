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

vi.mock('@/features/address/components/address-fields-with-cep', () => ({
  AddressFieldsWithCep: () => <div data-testid="address-fields" />,
}))

const FIXED_BIRTH_DATE = new Date('1990-05-10T12:00:00.000Z')
vi.mock('@/components/ui/date-picker', () => ({
  DatePicker: ({
    value,
    onChange,
  }: {
    value?: Date
    onChange: (d: Date | undefined) => void
  }) => (
    <button
      type="button"
      data-testid="date-picker"
      data-value={value?.toISOString() ?? ''}
      onClick={() => onChange(FIXED_BIRTH_DATE)}
    >
      pick-date
    </button>
  ),
}))

import { ClientForm } from './client-form'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ClientForm', () => {
  it('renderiza campos pessoais para PF (default INDIVIDUAL)', () => {
    render(<ClientForm />)
    expect(screen.getByLabelText(/Profissão/i)).toBeTruthy()
    expect(screen.getByText(/Estado civil/i)).toBeTruthy()
    expect(screen.getByText(/Data de nascimento/i)).toBeTruthy()
    expect(screen.getByTestId('date-picker')).toBeTruthy()
  })
  it('não submete quando campos obrigatórios estão vazios', async () => {
    render(<ClientForm />)
    fireEvent.click(screen.getByRole('button', { name: /Criar cliente/i }))
    await waitFor(() => {
      expect(mutateMock).not.toHaveBeenCalled()
    })
  })
  it('redireciona para /clients/{id} ao sucesso', () => {
    mutateMock.mockImplementation(
      (_values: unknown, opts: { onSuccess?: (resp: unknown) => void }) => {
        opts.onSuccess?.({ data: { data: { id: 'client-99' } } })
      }
    )
    render(<ClientForm />)
    fireEvent.change(screen.getByLabelText(/CPF/i), {
      target: { value: '12345678901' },
    })
    fireEvent.change(screen.getByLabelText(/Nome legal/i), {
      target: { value: 'João Silva' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Criar cliente/i }))
    return waitFor(() => {
      expect(mutateMock).toHaveBeenCalledTimes(1)
      expect(pushMock).toHaveBeenCalledWith('/clients/client-99')
    })
  })
  it('cancelar volta para /clients', () => {
    render(<ClientForm />)
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }))
    expect(pushMock).toHaveBeenCalledWith('/clients')
  })
  it('serializa fiscalBirthDate como ISO datetime completo (regressão)', async () => {
    mutateMock.mockImplementation(
      (_values: unknown, opts: { onSuccess?: (resp: unknown) => void }) => {
        opts.onSuccess?.({ data: { data: { id: 'client-77' } } })
      }
    )
    render(<ClientForm />)
    fireEvent.change(screen.getByLabelText(/CPF/i), {
      target: { value: '12345678901' },
    })
    fireEvent.change(screen.getByLabelText(/Nome legal/i), {
      target: { value: 'João Silva' },
    })
    fireEvent.click(screen.getByTestId('date-picker'))
    fireEvent.click(screen.getByRole('button', { name: /Criar cliente/i }))
    await waitFor(() => {
      expect(mutateMock).toHaveBeenCalledTimes(1)
    })
    const submittedValues = mutateMock.mock.calls[0]?.[0] as Record<
      string,
      unknown
    >
    expect(submittedValues.fiscalBirthDate).toBe(FIXED_BIRTH_DATE.toISOString())
    expect(submittedValues.fiscalBirthDate).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
    )
  })
})
