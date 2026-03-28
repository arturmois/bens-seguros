/**
 * Embed script for the Bens Seguros Chat Widget.
 *
 * Usage: Add this script tag to any page:
 *   <script src="https://widget.example.com/embed.js" data-channel-id="CHANNEL_ID"></script>
 *
 * The script creates an iframe with the widget SPA and manages
 * pointer-events so the iframe only captures clicks when the chat is open.
 */
;(function embedWidget(): void {
  // Find the script tag that loaded this file
  const scripts = document.querySelectorAll<HTMLScriptElement>(
    'script[data-channel-id]'
  )
  const currentScript = scripts[scripts.length - 1]

  if (!currentScript) return

  const channelId = currentScript.getAttribute('data-channel-id')
  if (!channelId) return

  // Derive origin from the script src — widget SPA served at /widget-app/
  const origin = new URL(currentScript.src).origin

  // Create iframe
  const iframe = document.createElement('iframe')
  iframe.src = `${origin}/widget-app/?channelId=${encodeURIComponent(channelId)}`
  iframe.title = 'Chat Widget'
  iframe.setAttribute('aria-label', 'Chat de atendimento')

  // Styling: full viewport overlay, pointer-events off by default
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

  // Allow the button inside the iframe to receive clicks
  // by enabling pointer-events only on the iframe content area
  iframe.style.pointerEvents = 'none'
  iframe.allow = 'clipboard-write'

  document.body.appendChild(iframe)

  // Listen for postMessage from the widget iframe
  window.addEventListener('message', (event: MessageEvent) => {
    // Verify the message comes from our iframe
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

  // After initial load, enable pointer-events briefly to allow button clicks,
  // then the widget itself will manage via postMessage
  iframe.addEventListener('load', () => {
    // The button needs pointer-events to be clickable.
    // We use a CSS trick: the iframe always receives pointer-events,
    // but the widget internal CSS handles the transparent clickthrough.
    // Actually, we need pointer-events on the iframe for the button.
    // Solution: always have pointer-events auto, but size the iframe
    // to just the button area when closed.
    iframe.style.pointerEvents = 'auto'
    iframe.style.width = '80px'
    iframe.style.height = '80px'
  })
})()
