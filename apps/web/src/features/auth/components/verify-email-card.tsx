'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Mail } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { getActiveOrgCookie } from '@/lib/org-cookie'
import { useRouter, useSearchParams } from 'next/navigation'

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
        <Mail className="text-accent-400 size-8" />
      </div>
      <h1 className="mb-2 text-xl font-bold text-slate-100">
        Verifique seu email
      </h1>
      <p className="mb-2 text-sm text-slate-400">
        Enviamos um link de verificação para
      </p>
      <p className="mb-6 text-sm font-medium text-slate-200">{email}</p>
      <p className="mb-6 text-sm text-slate-400">
        Clique no link do email para ativar sua conta. O link expira em 24
        horas.
      </p>
      <Button
        variant="outline"
        className="w-full border-white/10 text-slate-300 hover:bg-white/[0.06]"
        onClick={handleResend}
        disabled={cooldown > 0 || isSending}
      >
        {isSending
          ? 'Enviando...'
          : cooldown > 0
            ? `Reenviar em ${String(cooldown)}s`
            : 'Reenviar email'}
      </Button>
      <p className="mt-4 text-xs text-slate-500">
        Não recebeu? Verifique sua pasta de spam.
      </p>
    </div>
  )
}
