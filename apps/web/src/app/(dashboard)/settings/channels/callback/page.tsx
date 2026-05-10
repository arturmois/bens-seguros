'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function MetaOAuthCallbackPage() {
  const searchParams = useSearchParams()
  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    if (window.opener) {
      window.opener.postMessage(
        { type: 'meta-oauth-callback', code, state, error },
        window.location.origin
      )
      window.close()
    }
  }, [searchParams])
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Processando autorização...</p>
    </div>
  )
}
