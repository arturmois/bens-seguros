// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { FormField } from './form-field'

afterEach(() => {
  cleanup()
})

describe('FormField', () => {
  it('renders label and child input', () => {
    render(
      <FormField label="Nome">
        <input data-testid="input" />
      </FormField>
    )
    expect(screen.getByText('Nome')).toBeTruthy()
    expect(screen.getByTestId('input')).toBeTruthy()
  })

  it('renders required asterisk when required', () => {
    render(
      <FormField label="CPF" required>
        <input />
      </FormField>
    )
    expect(screen.getByText('*')).toBeTruthy()
  })

  it('renders error message with role="alert"', () => {
    render(
      <FormField label="Email" error="Email inválido">
        <input />
      </FormField>
    )
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toBe('Email inválido')
  })

  it('does not apply col-span class when span is omitted', () => {
    const { container } = render(
      <FormField label="Nome">
        <input />
      </FormField>
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).not.toMatch(/col-span/)
  })

  it('applies col-span-full when span="full"', () => {
    const { container } = render(
      <FormField label="Observações" span="full">
        <textarea />
      </FormField>
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('col-span-full')
  })

  it('applies col-span-2 when span={2}', () => {
    const { container } = render(
      <FormField label="Endereço" span={2}>
        <input />
      </FormField>
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('col-span-2')
  })
})
