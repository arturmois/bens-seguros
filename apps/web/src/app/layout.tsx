import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { Inter } from 'next/font/google'
import { Providers } from '@/providers'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

// Nonce-based CSP requires dynamic rendering on every request
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: {
    default: 'Bens Seguros',
    template: '%s | Bens Seguros',
  },
  description: 'ERP para Corretoras de Seguros',
  icons: {
    icon: '/favicon.svg',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const nonce = (await headers()).get('x-nonce') ?? undefined

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers nonce={nonce}>
          <TooltipProvider>
            {children}
            <Toaster richColors position="top-right" />
          </TooltipProvider>
        </Providers>
      </body>
    </html>
  )
}
