;(function embedWidget(): void {
  const scripts = document.querySelectorAll<HTMLScriptElement>(
    'script[data-channel-id]'
  )
  const currentScript = scripts[scripts.length - 1]
  if (!currentScript) return
  const channelId = currentScript.getAttribute('data-channel-id')
  if (!channelId) return
  const origin = new URL(currentScript.src).origin
  const iframe = document.createElement('iframe')
  iframe.src = `${origin}/widget-app/?channelId=${encodeURIComponent(channelId)}`
  iframe.title = 'Chat Widget'
  iframe.setAttribute('aria-label', 'Chat de atendimento')
  Object.assign(iframe.style, {
    position: 'fixed',
    bottom: '0',
    right: '0',
    width: '420px',
    height: '600px',
    maxWidth: '100vw',
    maxHeight: '100dvh',
    border: 'none',
    zIndex: '2147483647',
    pointerEvents: 'none',
    colorScheme: 'normal',
    background: 'transparent',
  })
  iframe.style.pointerEvents = 'none'
  iframe.allow = 'clipboard-write'
  document.body.appendChild(iframe)
  window.addEventListener('message', (event: MessageEvent) => {
    if (event.source !== iframe.contentWindow) return
    if (typeof event.data !== 'object' || event.data === null) return
    const data: Record<string, unknown> = event.data
    const messageType = typeof data['type'] === 'string' ? data['type'] : null
    switch (messageType) {
      case 'widget:open':
        iframe.style.pointerEvents = 'auto'
        iframe.style.width = '420px'
        iframe.style.height = '600px'
        break
      case 'widget:close':
        iframe.style.pointerEvents = 'none'
        break
      default:
        break
    }
  })
  iframe.addEventListener('load', () => {
    iframe.style.pointerEvents = 'auto'
    iframe.style.width = '80px'
    iframe.style.height = '80px'
  })
})()
