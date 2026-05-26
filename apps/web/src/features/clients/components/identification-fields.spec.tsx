// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { afterEach, describe, expect, it } from 'vitest'

import { DEFAULT_VALUES } from '../lib/client-form-schema'
import type { ClientFormValues } from '../lib/types'
import { IdentificationFields } from './identification-fields'

function Wrapper({
  personType,
  document: documentValue,
  children,
}: {
  personType: 'INDIVIDUAL' | 'COMPANY'
  document?: string
  children: ReactNode
}) {
  const form = useForm<ClientFormValues>({
    defaultValues: {
      ...DEFAULT_VALUES,
      personType,
      document: documentValue ?? '',
    },
  })
  return <FormProvider {...form}>{children}</FormProvider>
}

afterEach(() => {
  cleanup()
})

describe('IdentificationFields — typing CNPJ (COMPANY)', () => {
  it('preserva todos os 14 dígitos ao digitar CNPJ char a char', async () => {
    const user = userEvent.setup()
    render(
      <Wrapper personType="COMPANY">
        <IdentificationFields />
      </Wrapper>
    )

    const cnpjInput = screen.getByLabelText(/CNPJ/i) as HTMLInputElement
    await user.type(cnpjInput, '11222333000181')

    expect(cnpjInput.value.replace(/\D/g, '')).toBe('11222333000181')
  })

  it('aplica máscara CNPJ ao terminar de digitar 14 dígitos', async () => {
    const user = userEvent.setup()
    render(
      <Wrapper personType="COMPANY">
        <IdentificationFields />
      </Wrapper>
    )

    const cnpjInput = screen.getByLabelText(/CNPJ/i) as HTMLInputElement
    await user.type(cnpjInput, '11222333000181')

    expect(cnpjInput.value).toBe('11.222.333/0001-81')
  })
})

describe('IdentificationFields — typing CPF (INDIVIDUAL)', () => {
  it('preserva todos os 11 dígitos ao digitar CPF char a char', async () => {
    const user = userEvent.setup()
    render(
      <Wrapper personType="INDIVIDUAL">
        <IdentificationFields />
      </Wrapper>
    )

    const cpfInput = screen.getByLabelText(/CPF/i) as HTMLInputElement
    await user.type(cpfInput, '52998224725')

    expect(cpfInput.value).toBe('529.982.247-25')
  })
})

describe('IdentificationFields — sanitização de valor censurado no mount', () => {
  it('não crasha ao inicializar com CNPJ censurado e mantém campo vazio', () => {
    render(
      <Wrapper personType="COMPANY" document="**.***.***/0001-95">
        <IdentificationFields />
      </Wrapper>
    )

    const cnpjInput = screen.getByLabelText(/CNPJ/i) as HTMLInputElement
    expect(cnpjInput.value).toBe('')
  })

  it('não crasha ao inicializar com CPF censurado e mantém campo vazio', () => {
    render(
      <Wrapper personType="INDIVIDUAL" document="***.***.***-09">
        <IdentificationFields />
      </Wrapper>
    )

    const cpfInput = screen.getByLabelText(/CPF/i) as HTMLInputElement
    expect(cpfInput.value).toBe('')
  })

  it('renderiza CNPJ já formatado vindo de buildInitialValues (edit mode)', () => {
    render(
      <Wrapper personType="COMPANY" document="11.222.333/0001-81">
        <IdentificationFields />
      </Wrapper>
    )

    const cnpjInput = screen.getByLabelText(/CNPJ/i) as HTMLInputElement
    expect(cnpjInput.value).toBe('11.222.333/0001-81')
  })

  it('renderiza CPF já formatado vindo de buildInitialValues (edit mode)', () => {
    render(
      <Wrapper personType="INDIVIDUAL" document="529.982.247-25">
        <IdentificationFields />
      </Wrapper>
    )

    const cpfInput = screen.getByLabelText(/CPF/i) as HTMLInputElement
    expect(cpfInput.value).toBe('529.982.247-25')
  })
})
