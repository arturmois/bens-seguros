'use client'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { authClient } from '@/lib/auth-client'
import { getActiveOrgCookie } from '@/lib/org-cookie'
import { Mail } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

const RESEND_COOLDOWN_SECONDS = 60

export function VerifyEmailCard() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const emailFromQuery = searchParams.get('email')
  const email = user?.email ?? emailFromQuery
  const [cooldown, setCooldown] = useState(0)
  const [isSending, setIsSending] = useState(false)
  useEffect(() => {
    if (!isLoading && user?.emailVerified) {
      const activeOrg = getActiveOrgCookie()
      router.replace(activeOrg ? '/dashboard' : '/onboarding')
    }
  }, [isLoading, user?.emailVerified, router])
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])
  const handleResend = useCallback(async () => {
    if (!email || cooldown > 0) return
    setIsSending(true)
    try {
      await authClient.sendVerificationEmail({
        email,
        callbackURL: '/onboarding',
      })
      setCooldown(RESEND_COOLDOWN_SECONDS)
      toast.success('Email de verificação reenviado')
    } catch {
      toast.error('Erro ao reenviar email. Tente novamente.')
    } finally {
      setIsSending(false)
    }
  }, [email, cooldown])
  useEffect(() => {
    if (!isLoading && !email) {
      router.replace('/login')
    }
  }, [isLoading, email, router])
  if (!email) return null
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-6 flex size-16 items-center justify-center rounded-full bg-white/[0.06]">
        <Mail className="size-8 text-accent-400" />
      </div>
      <h1 className="mb-2 font-bold text-(--auth-foreground) text-xl">
        Verifique seu email
      </h1>
      <p className="mb-2 text-(--auth-foreground-muted) text-sm">
        Enviamos um link de verificação para
      </p>
      <p className="mb-6 font-medium text-(--auth-foreground) text-sm">
        {email}
      </p>
      <p className="mb-6 text-(--auth-foreground-muted) text-sm">
        Clique no link do email para ativar sua conta. O link expira em 24
        horas.
      </p>
      <Button
        variant="outline"
        className="w-full border-(--auth-input-border) text-(--auth-foreground-muted) hover:bg-(--auth-input-bg)"
        onClick={handleResend}
        disabled={cooldown > 0 || isSending}
      >
        {isSending
          ? 'Enviando...'
          : cooldown > 0
            ? `Reenviar em ${String(cooldown)}s`
            : 'Reenviar email'}
      </Button>
      <p className="mt-4 text-(--auth-foreground-subtle) text-xs">
        Não recebeu? Verifique sua pasta de spam.
      </p>
    </div>
  )
}
