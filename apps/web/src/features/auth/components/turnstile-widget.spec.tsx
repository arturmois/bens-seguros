// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { TurnstileWidget } from './turnstile-widget'

const renderMock = vi.fn().mockReturnValue('widget-id-1')
const removeMock = vi.fn()

function installTurnstile() {
  ;(window as unknown as { turnstile?: unknown }).turnstile = {
    render: renderMock,
    reset: vi.fn(),
    remove: removeMock,
  }
}

function clearTurnstile() {
  delete (window as unknown as { turnstile?: unknown }).turnstile
  const existing = document.getElementById('cloudflare-turnstile')
  if (existing) existing.remove()
}

beforeEach(() => {
  vi.clearAllMocks()
  clearTurnstile()
})

afterEach(() => {
  cleanup()
  clearTurnstile()
})

describe('TurnstileWidget', () => {
  it('renderiza container div quando script carrega com sucesso', async () => {
    installTurnstile()
    const onVerify = vi.fn()
    const { container } = render(
      <TurnstileWidget siteKey="test-key" onVerify={onVerify} />
    )
    const widgetDiv = container.querySelector('div.flex.justify-center')
    expect(widgetDiv).toBeTruthy()
    await waitFor(() => {
      expect(renderMock).toHaveBeenCalled()
    })
  })

  it('chama window.turnstile.render com sitekey + callbacks', async () => {
    installTurnstile()
    const onVerify = vi.fn()
    const onExpire = vi.fn()
    const onError = vi.fn()
    render(
      <TurnstileWidget
        siteKey="my-site-key"
        onVerify={onVerify}
        onExpire={onExpire}
        onError={onError}
        theme="dark"
      />
    )
    await waitFor(() => expect(renderMock).toHaveBeenCalled())
    const callArgs = renderMock.mock.calls[0]?.[1]
    expect(callArgs.sitekey).toBe('my-site-key')
    expect(callArgs.theme).toBe('dark')
    expect(typeof callArgs.callback).toBe('function')
    expect(typeof callArgs['expired-callback']).toBe('function')
    expect(typeof callArgs['error-callback']).toBe('function')
  })

  it('propaga token recebido via callback do Cloudflare', async () => {
    installTurnstile()
    const onVerify = vi.fn()
    render(<TurnstileWidget siteKey="k" onVerify={onVerify} />)
    await waitFor(() => expect(renderMock).toHaveBeenCalled())
    const callback = renderMock.mock.calls[0]?.[1].callback
    callback('captured-token-xyz')
    expect(onVerify).toHaveBeenCalledWith('captured-token-xyz')
  })

  it('chama onExpire quando Cloudflare expira o token', async () => {
    installTurnstile()
    const onVerify = vi.fn()
    const onExpire = vi.fn()
    render(
      <TurnstileWidget siteKey="k" onVerify={onVerify} onExpire={onExpire} />
    )
    await waitFor(() => expect(renderMock).toHaveBeenCalled())
    const expiredCb = renderMock.mock.calls[0]?.[1]['expired-callback']
    expiredCb()
    expect(onExpire).toHaveBeenCalled()
  })

  it('remove widget no unmount', async () => {
    installTurnstile()
    const { unmount } = render(
      <TurnstileWidget siteKey="k" onVerify={vi.fn()} />
    )
    await waitFor(() => expect(renderMock).toHaveBeenCalled())
    unmount()
    expect(removeMock).toHaveBeenCalledWith('widget-id-1')
  })

  it('default theme é "auto"', async () => {
    installTurnstile()
    render(<TurnstileWidget siteKey="k" onVerify={vi.fn()} />)
    await waitFor(() => expect(renderMock).toHaveBeenCalled())
    expect(renderMock.mock.calls[0]?.[1].theme).toBe('auto')
  })

  it('mostra erro se script falha em carregar', async () => {
    const originalCreateElement = document.createElement.bind(document)
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tag: string) => {
        if (tag === 'script') {
          const script = originalCreateElement('script')
          void Promise.resolve().then(() => {
            script.dispatchEvent(new Event('error'))
          })
          return script
        }
        return originalCreateElement(tag)
      })
    render(<TurnstileWidget siteKey="k" onVerify={vi.fn()} />)
    await waitFor(() => {
      expect(
        screen.getByText(/Falha ao carregar verificação anti-bot/i)
      ).toBeTruthy()
    })
    createElementSpy.mockRestore()
  })
})
