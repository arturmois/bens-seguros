'use client'

import '@/lib/zod-pt-br'
import { ThemeProvider } from 'next-themes'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { NuqsAdapter } from 'nuqs/adapters/next/app'

interface ProvidersProps {
  readonly children: React.ReactNode
  readonly nonce?: string
}

export function Providers({ children, nonce }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 5 * 60 * 1000 },
        },
      })
  )

  return (
    <NuqsAdapter>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        nonce={nonce}
      >
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </ThemeProvider>
    </NuqsAdapter>
  )
}
