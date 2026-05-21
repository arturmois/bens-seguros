// @vitest-environment jsdom
import { zodResolver } from '@hookform/resolvers/zod'
import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { type FieldValues, FormProvider, useForm } from 'react-hook-form'
import { afterEach, describe, expect, it } from 'vitest'

import { businessDetailsSchema } from '@repo/shared'

import { BusinessFields } from './business'

interface WrapperProps {
  readonly defaults?: Record<string, unknown>
}

function Wrapper({ defaults }: WrapperProps): ReactNode {
  const methods = useForm<FieldValues>({
    resolver: zodResolver(businessDetailsSchema),
    defaultValues: {
      branch: 'BUSINESS',
      legalName: '',
      cnpj: '',
      businessActivity: '',
      businessSegment: null,
      areaM2: undefined,
      ...defaults,
    },
  })
  return (
    <FormProvider {...methods}>
      <BusinessFields
        register={methods.register}
        control={methods.control}
        setValue={methods.setValue}
        getValues={methods.getValues}
      />
    </FormProvider>
  )
}

afterEach(() => cleanup())

describe('BusinessFields', () => {
  it('mostra Área (m²) por padrão quando businessSegment é null', () => {
    render(<Wrapper />)
    expect(screen.queryByText('Área (m²)')).not.toBeNull()
  })

  it('esconde Área (m²) quando businessSegment é CONSULTING', () => {
    render(<Wrapper defaults={{ businessSegment: 'CONSULTING' }} />)
    expect(screen.queryByText('Área (m²)')).toBeNull()
  })

  it('esconde Área (m²) quando businessSegment é TECHNOLOGY', () => {
    render(<Wrapper defaults={{ businessSegment: 'TECHNOLOGY' }} />)
    expect(screen.queryByText('Área (m²)')).toBeNull()
  })

  it('esconde Área (m²) quando businessSegment é PROFESSIONAL_SERVICES', () => {
    render(<Wrapper defaults={{ businessSegment: 'PROFESSIONAL_SERVICES' }} />)
    expect(screen.queryByText('Área (m²)')).toBeNull()
  })

  it('mostra Área (m²) quando businessSegment é INDUSTRY', () => {
    render(<Wrapper defaults={{ businessSegment: 'INDUSTRY' }} />)
    expect(screen.queryByText('Área (m²)')).not.toBeNull()
  })

  it('mostra Área (m²) quando businessSegment é RETAIL', () => {
    render(<Wrapper defaults={{ businessSegment: 'RETAIL' }} />)
    expect(screen.queryByText('Área (m²)')).not.toBeNull()
  })

  it('mostra Área (m²) quando businessSegment é OTHER', () => {
    render(<Wrapper defaults={{ businessSegment: 'OTHER' }} />)
    expect(screen.queryByText('Área (m²)')).not.toBeNull()
  })

  it('renderiza o campo Segmento empresarial', () => {
    render(<Wrapper />)
    expect(screen.queryByText('Segmento empresarial')).not.toBeNull()
  })
})
