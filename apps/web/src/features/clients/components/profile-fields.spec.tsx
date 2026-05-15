// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { FormProvider, useForm } from 'react-hook-form'
import { afterEach, describe, expect, it } from 'vitest'

import { ProfileFields } from './profile-fields'

afterEach(() => {
  cleanup()
})

interface FormShape {
  profession: string | null
  maritalStatus: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED' | 'OTHER' | null
  fiscalBirthDate: Date | null
}

function Harness({ defaults }: { readonly defaults?: Partial<FormShape> }) {
  const form = useForm<FormShape>({
    defaultValues: {
      profession: null,
      maritalStatus: null,
      fiscalBirthDate: null,
      ...defaults,
    },
  })
  return (
    <FormProvider {...form}>
      <ProfileFields />
    </FormProvider>
  )
}

describe('<ProfileFields />', () => {
  it('renderiza os 3 campos com labels pt-BR', () => {
    render(<Harness />)
    expect(screen.getByLabelText('Profissão')).toBeTruthy()
    expect(screen.getByText('Estado civil')).toBeTruthy()
    expect(screen.getByText('Data de nascimento fiscal')).toBeTruthy()
  })

  it('aceita valores iniciais nulos sem crash', () => {
    expect(() => render(<Harness />)).not.toThrow()
    const profession = screen.getByLabelText('Profissão') as HTMLInputElement
    expect(profession.value).toBe('')
  })

  it('popula o input de profissão quando initial é string', () => {
    render(<Harness defaults={{ profession: 'Engenheira' }} />)
    const input = screen.getByLabelText('Profissão') as HTMLInputElement
    expect(input.value).toBe('Engenheira')
  })

  it('exibe a data formatada quando fiscalBirthDate é Date', () => {
    render(
      <Harness
        defaults={{ fiscalBirthDate: new Date('1990-05-15T00:00:00') }}
      />
    )
    expect(screen.getByDisplayValue('15/05/1990')).toBeTruthy()
  })
})
