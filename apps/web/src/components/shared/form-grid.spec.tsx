// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { FormGrid } from './form-grid'

afterEach(() => {
  cleanup()
})

describe('FormGrid', () => {
  it('renders children inside a container-query grid', () => {
    const { container, getByTestId } = render(
      <FormGrid>
        <div data-testid="child" />
      </FormGrid>
    )
    const outer = container.firstChild as HTMLElement
    expect(outer.className).toContain('@container')
    const inner = outer.firstChild as HTMLElement
    expect(inner.className).toContain('grid')
    expect(inner.className).toContain('grid-cols-1')
    expect(inner.className).toContain('@[480px]:grid-cols-2')
    expect(inner.className).toContain('@[920px]:grid-cols-3')
    expect(getByTestId('child')).toBeTruthy()
  })

  it('omits 3-col class when columns={2}', () => {
    const { container } = render(
      <FormGrid columns={2}>
        <div />
      </FormGrid>
    )
    const inner = (container.firstChild as HTMLElement)
      .firstChild as HTMLElement
    expect(inner.className).toContain('@[480px]:grid-cols-2')
    expect(inner.className).not.toContain('@[920px]:grid-cols-3')
  })

  it('uses gap-4 by default', () => {
    const { container } = render(
      <FormGrid>
        <div />
      </FormGrid>
    )
    const inner = (container.firstChild as HTMLElement)
      .firstChild as HTMLElement
    expect(inner.className).toContain('gap-4')
  })

  it('applies gap-3 when gap="sm"', () => {
    const { container } = render(
      <FormGrid gap="sm">
        <div />
      </FormGrid>
    )
    const inner = (container.firstChild as HTMLElement)
      .firstChild as HTMLElement
    expect(inner.className).toContain('gap-3')
  })

  it('applies gap-6 when gap="lg"', () => {
    const { container } = render(
      <FormGrid gap="lg">
        <div />
      </FormGrid>
    )
    const inner = (container.firstChild as HTMLElement)
      .firstChild as HTMLElement
    expect(inner.className).toContain('gap-6')
  })
})
