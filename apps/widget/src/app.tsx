import { useCallback, useEffect, useState } from 'react'

import { WidgetButton } from './components/widget-button'
import { WidgetContainer } from './components/widget-container'
import { useWidgetState } from './hooks/use-widget-state'

function getChannelIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search)
  return params.get('channelId')
}

export function App(): React.JSX.Element | null {
  const channelId = getChannelIdFromUrl()
  const [isOpen, setIsOpen] = useState(false)
  const widgetState = useWidgetState(channelId)
  const handleOpen = useCallback(() => {
    setIsOpen(true)
    window.parent.postMessage({ type: 'widget:open' }, '*')
  }, [])
  const handleClose = useCallback(() => {
    setIsOpen(false)
    window.parent.postMessage({ type: 'widget:close' }, '*')
  }, [])
  useEffect(() => {
    function handleMessage(event: MessageEvent): void {
      if (typeof event.data !== 'object' || event.data === null) return
      const data: Record<string, unknown> = event.data
      if (typeof data['type'] !== 'string') return
      if (data['type'] === 'widget:toggle') {
        setIsOpen((prev) => {
          const next = !prev
          window.parent.postMessage(
            { type: next ? 'widget:open' : 'widget:close' },
            '*'
          )
          return next
        })
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])
  if (!channelId) {
    return null
  }
  if (widgetState.phase === 'loading') {
    return null
  }
  if (widgetState.phase === 'error') {
    return null
  }
  const primaryColor = widgetState.config?.widgetColor ?? '#1f4b5f'
  if (!isOpen) {
    return <WidgetButton onClick={handleOpen} color={primaryColor} />
  }
  return (
    <WidgetContainer
      widgetState={widgetState}
      onClose={handleClose}
      primaryColor={primaryColor}
    />
  )
}
