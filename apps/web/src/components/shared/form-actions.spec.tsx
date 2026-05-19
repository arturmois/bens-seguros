// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { FormActions } from './form-actions'

describe('FormActions', () => {
  afterEach(cleanup)

  it('renders children in flex container with default justify-end and gap-2', () => {
    render(
      <FormActions>
        <button>Cancelar</button>
        <button>Salvar</button>
      </FormActions>
    )
    const container = screen.getByRole('button', {
      name: 'Cancelar',
    }).parentElement as HTMLElement
    expect(container.className).toContain('flex')
    expect(container.className).toContain('justify-end')
    expect(container.className).toContain('gap-2')
    expect(container.className).toContain('pt-2')
  })

  it('respects align="start"', () => {
    render(
      <FormActions align="start">
        <button>X</button>
      </FormActions>
    )
    const container = screen.getByRole('button').parentElement as HTMLElement
    expect(container.className).toContain('justify-start')
    expect(container.className).not.toContain('justify-end')
  })

  it('respects align="between"', () => {
    render(
      <FormActions align="between">
        <button>X</button>
      </FormActions>
    )
    const container = screen.getByRole('button').parentElement as HTMLElement
    expect(container.className).toContain('justify-between')
  })

  it('respects gap=3 and gap=4', () => {
    const { rerender } = render(
      <FormActions gap={3}>
        <button>X</button>
      </FormActions>
    )
    expect(
      (screen.getByRole('button').parentElement as HTMLElement).className
    ).toContain('gap-3')

    rerender(
      <FormActions gap={4}>
        <button>X</button>
      </FormActions>
    )
    expect(
      (screen.getByRole('button').parentElement as HTMLElement).className
    ).toContain('gap-4')
  })

  it('omits pt-2 when noPadding', () => {
    render(
      <FormActions noPadding>
        <button>X</button>
      </FormActions>
    )
    const container = screen.getByRole('button').parentElement as HTMLElement
    expect(container.className).not.toContain('pt-2')
  })
})
