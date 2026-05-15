// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { FormSection } from './form-section'

afterEach(() => {
  cleanup()
})

describe('FormSection', () => {
  it('renders children without header when title is absent', () => {
    const { container } = render(
      <FormSection>
        <div data-testid="child" />
      </FormSection>
    )
    expect(container.querySelector('header')).toBeNull()
    expect(screen.getByTestId('child')).toBeTruthy()
  })

  it('renders title as h3 when title is provided', () => {
    render(
      <FormSection title="Dados Gerais">
        <div />
      </FormSection>
    )
    const heading = screen.getByRole('heading', {
      level: 3,
      name: 'Dados Gerais',
    })
    expect(heading).toBeTruthy()
  })

  it('renders description below the title', () => {
    render(
      <FormSection title="Endereço" description="Onde o cliente mora">
        <div />
      </FormSection>
    )
    expect(screen.getByText('Onde o cliente mora')).toBeTruthy()
  })

  it('renders actions slot on the right of the header', () => {
    render(
      <FormSection title="Items" actions={<button>Adicionar</button>}>
        <div />
      </FormSection>
    )
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeTruthy()
  })
})
