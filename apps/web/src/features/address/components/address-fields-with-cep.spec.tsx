// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentPropsWithoutRef, ElementType } from 'react'
import { type FieldValues, FormProvider, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CepLookupError } from '../hooks/use-cep-lookup'
import { AddressFieldsWithCep } from './address-fields-with-cep'

const lookupMock = vi.fn()
let useCepLookupReturn: {
  lookup: typeof lookupMock
  isLoading: boolean
  error: CepLookupError | null
} = {
  lookup: lookupMock,
  isLoading: false,
  error: null,
}

vi.mock('../hooks/use-cep-lookup', () => ({
  useCepLookup: () => useCepLookupReturn,
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}))

type InputMaskProps = ComponentPropsWithoutRef<'input'> & {
  component?: ElementType
  mask?: string
  replacement?: Record<string, RegExp>
}

vi.mock('@react-input/mask', () => ({
  InputMask: ({
    component: Component,
    mask: _mask,
    replacement: _replacement,
    ...rest
  }: InputMaskProps) =>
    Component ? <Component {...rest} /> : <input {...rest} />,
}))

interface FormShape {
  cep: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
}

function Harness({
  defaultValues,
}: {
  readonly defaultValues?: Partial<FormShape>
}) {
  const form = useForm<FieldValues>({
    defaultValues: {
      cep: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      ...defaultValues,
    },
  })
  return (
    <FormProvider {...form}>
      <AddressFieldsWithCep
        control={form.control}
        register={form.register}
        setValue={form.setValue}
      />
    </FormProvider>
  )
}

function getInputByName(name: string): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>(
    `input[name="${name}"]`
  )
  if (!input) throw new Error(`input[name="${name}"] not found`)
  return input
}

describe('<AddressFieldsWithCep />', () => {
  afterEach(() => {
    cleanup()
  })
  beforeEach(() => {
    lookupMock.mockReset()
    vi.mocked(toast.error).mockReset()
    useCepLookupReturn = { lookup: lookupMock, isLoading: false, error: null }
  })
  it('triggers lookup on blur after 8 digits and autofills fields', async () => {
    lookupMock.mockResolvedValue({
      zipCode: '01311000',
      street: 'Avenida Paulista',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      complement: null,
    })
    const user = userEvent.setup()
    render(<Harness />)
    const cep = getInputByName('cep')
    await user.type(cep, '01311000')
    fireEvent.blur(cep)
    await waitFor(() => {
      expect(getInputByName('street').value).toBe('Avenida Paulista')
    })
    expect(getInputByName('neighborhood').value).toBe('Bela Vista')
    expect(getInputByName('city').value).toBe('São Paulo')
    expect(getInputByName('state').value).toBe('SP')
    expect(getInputByName('number').value).toBe('')
    expect(getInputByName('complement').value).toBe('')
  })
  it('shows error toast and leaves fields untouched on not-found', async () => {
    lookupMock.mockResolvedValue(null)
    useCepLookupReturn = {
      lookup: lookupMock,
      isLoading: false,
      error: { type: 'not-found' },
    }
    render(
      <Harness
        defaultValues={{ street: 'Rua Existente', city: 'Cidade Existente' }}
      />
    )
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/CEP não encontrado/i)
      )
    })
    expect(getInputByName('street').value).toBe('Rua Existente')
    expect(getInputByName('city').value).toBe('Cidade Existente')
  })
  it('overwrites existing values on a successful lookup', async () => {
    lookupMock.mockResolvedValue({
      zipCode: '01311000',
      street: 'Avenida Paulista',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      complement: null,
    })
    const user = userEvent.setup()
    render(
      <Harness defaultValues={{ street: 'Rua Antiga', city: 'Outra Cidade' }} />
    )
    const cep = getInputByName('cep')
    await user.type(cep, '01311000')
    fireEvent.blur(cep)
    await waitFor(() => {
      expect(getInputByName('street').value).toBe('Avenida Paulista')
    })
    expect(getInputByName('city').value).toBe('São Paulo')
  })
  it('triggers lookup on completion (8 digits typed) without waiting for blur', async () => {
    lookupMock.mockResolvedValue({
      zipCode: '01311000',
      street: 'Avenida Paulista',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      complement: null,
    })
    const user = userEvent.setup()
    render(<Harness />)
    await user.type(getInputByName('cep'), '01311000')
    await waitFor(() => expect(lookupMock).toHaveBeenCalledWith('01311000'))
  })
})
