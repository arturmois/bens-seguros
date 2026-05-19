// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import type { ComponentProps, ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: ComponentProps<'a'> & { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

import { FormPageShell } from './form-page-shell'

afterEach(() => {
  cleanup()
})

describe('FormPageShell', () => {
  it('renders breadcrumb, title, description and card', () => {
    render(
      <FormPageShell
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Clientes', href: '/clients' },
          { label: 'Editar' },
        ]}
        title="Editar cliente"
        description="Atualize as informações"
        cardTitle="Dados do cliente"
        cardDescription="Altere os campos necessários"
      >
        <div data-testid="form-body" />
      </FormPageShell>
    )
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Clientes' })).toBeTruthy()
    expect(screen.getByText('Editar')).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: 'Editar cliente', level: 1 })
    ).toBeTruthy()
    expect(screen.getByText('Atualize as informações')).toBeTruthy()
    expect(screen.getByText('Dados do cliente')).toBeTruthy()
    expect(screen.getByText('Altere os campos necessários')).toBeTruthy()
    expect(screen.getByTestId('form-body')).toBeTruthy()
  })

  it('renders without description when omitted', () => {
    render(
      <FormPageShell breadcrumb={[{ label: 'X' }]} title="T" cardTitle="C">
        <div />
      </FormPageShell>
    )
    expect(screen.getByRole('heading', { name: 'T', level: 1 })).toBeTruthy()
    expect(screen.getByText('C')).toBeTruthy()
  })

  it('renders without cardDescription when omitted', () => {
    render(
      <FormPageShell breadcrumb={[{ label: 'X' }]} title="T" cardTitle="C">
        <div data-testid="body" />
      </FormPageShell>
    )
    expect(screen.getByTestId('body')).toBeTruthy()
  })
})
