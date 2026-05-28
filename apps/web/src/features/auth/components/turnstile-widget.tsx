'use client'

import { useEffect, useRef, useState } from 'react'

const TURNSTILE_SCRIPT_URL =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
const TURNSTILE_SCRIPT_ID = 'cloudflare-turnstile'

interface TurnstileRenderOptions {
  sitekey: string
  callback: (token: string) => void
  'error-callback'?: () => void
  'expired-callback'?: () => void
  theme?: 'light' | 'dark' | 'auto'
}

interface TurnstileGlobal {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string
  reset: (widgetId?: string) => void
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileGlobal
  }
}

const TURNSTILE_READY_TIMEOUT_MS = 3000
const TURNSTILE_READY_POLL_MS = 50

function waitForTurnstileGlobal(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const start = Date.now()
    const tick = () => {
      if (window.turnstile) return resolve()
      if (Date.now() - start > TURNSTILE_READY_TIMEOUT_MS) {
        return reject(new Error('Turnstile global never appeared'))
      }
      window.setTimeout(tick, TURNSTILE_READY_POLL_MS)
    }
    tick()
  })
}

function loadScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'))
  if (window.turnstile) return Promise.resolve()
  const existing = document.getElementById(TURNSTILE_SCRIPT_ID)
  if (existing) {
    return waitForTurnstileGlobal()
  }
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.id = TURNSTILE_SCRIPT_ID
    script.src = TURNSTILE_SCRIPT_URL
    script.async = true
    script.defer = true
    script.addEventListener('load', () => {
      waitForTurnstileGlobal().then(resolve, reject)
    })
    script.addEventListener('error', () =>
      reject(new Error('Failed to load Turnstile'))
    )
    document.head.appendChild(script)
  })
}

interface TurnstileWidgetProps {
  siteKey: string
  onVerify: (token: string) => void
  onExpire?: () => void
  onError?: () => void
  theme?: 'light' | 'dark' | 'auto'
}

export function TurnstileWidget({
  siteKey,
  onVerify,
  onExpire,
  onError,
  theme = 'auto',
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [scriptError, setScriptError] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadScript()
      .then(() => {
        if (cancelled) return
        const turnstile = window.turnstile
        const container = containerRef.current
        if (!turnstile || !container) return
        widgetIdRef.current = turnstile.render(container, {
          sitekey: siteKey,
          callback: (token) => onVerify(token),
          'expired-callback': () => onExpire?.(),
          'error-callback': () => onError?.(),
          theme,
        })
      })
      .catch(() => {
        if (cancelled) return
        setScriptError(true)
      })
    return () => {
      cancelled = true
      const turnstile = window.turnstile
      const widgetId = widgetIdRef.current
      if (turnstile && widgetId) turnstile.remove(widgetId)
      widgetIdRef.current = null
    }
  }, [siteKey, onVerify, onExpire, onError, theme])

  if (scriptError) {
    return (
      <p role="alert" className="text-destructive text-sm">
        Falha ao carregar verificação anti-bot. Recarregue a página.
      </p>
    )
  }
  return <div ref={containerRef} className="flex justify-center" />
}
