// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { useFormContext } from 'react-hook-form'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { FieldWrapper } from './field-wrapper'

vi.mock('react-hook-form', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-hook-form')>()
  return {
    ...actual,
    useFormContext: vi.fn(() => ({
      formState: { errors: {} },
    })),
  }
})

afterEach(() => {
  cleanup()
})

describe('FieldWrapper a11y — htmlFor/id association', () => {
  it('label htmlFor aponta para id do input filho (register-based)', () => {
    const { container } = render(
      <FieldWrapper label="Nome" name="name">
        <input type="text" />
      </FieldWrapper>
    )
    const label = container.querySelector('label')
    const input = container.querySelector('input')
    expect(label).toBeTruthy()
    expect(input).toBeTruthy()
    const htmlFor = label?.getAttribute('for')
    const inputId = input?.getAttribute('id')
    expect(htmlFor).toBeTruthy()
    expect(htmlFor).toBe(inputId)
  })

  it('id do input e unico por instancia (dois FieldWrapper distintos)', () => {
    const { container } = render(
      <>
        <FieldWrapper label="Campo A" name="a">
          <input type="text" />
        </FieldWrapper>
        <FieldWrapper label="Campo B" name="b">
          <input type="text" />
        </FieldWrapper>
      </>
    )
    const inputs = container.querySelectorAll('input')
    expect(inputs.length).toBe(2)
    expect(inputs[0]?.getAttribute('id')).not.toBe(
      inputs[1]?.getAttribute('id')
    )
  })

  it('quando errorMessage existe: p[role=alert] tem id e input tem aria-describedby', () => {
    vi.mocked(useFormContext).mockReturnValueOnce({
      formState: {
        errors: { name: { message: 'Campo obrigatório' } },
      },
    } as unknown as ReturnType<typeof useFormContext>)

    const { container } = render(
      <FieldWrapper label="Nome" name="name">
        <input type="text" />
      </FieldWrapper>
    )
    const input = container.querySelector('input')
    const errorP = container.querySelector('[role="alert"]')
    expect(errorP).toBeTruthy()
    const errorId = errorP?.getAttribute('id')
    expect(errorId).toBeTruthy()
    expect(input?.getAttribute('aria-describedby')).toBe(errorId)
  })

  it('quando children e funcao: label htmlFor aponta para id passado a funcao', () => {
    const { container } = render(
      <FieldWrapper label="Combustível" name="fuelType">
        {(id) => (
          <button type="button" id={id}>
            trigger
          </button>
        )}
      </FieldWrapper>
    )
    const label = container.querySelector('label')
    const button = container.querySelector('button')
    const htmlFor = label?.getAttribute('for')
    const buttonId = button?.getAttribute('id')
    expect(htmlFor).toBeTruthy()
    expect(htmlFor).toBe(buttonId)
  })

  it('hint renderiza quando nao ha erro', () => {
    const { container } = render(
      <FieldWrapper label="Campo" hint="Dica aqui">
        <input type="text" />
      </FieldWrapper>
    )
    const hint = container.querySelector('p:not([role="alert"])')
    expect(hint?.textContent).toBe('Dica aqui')
  })
})
