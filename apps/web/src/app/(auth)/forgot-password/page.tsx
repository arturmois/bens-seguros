import Link from 'next/link'
import { Suspense } from 'react'
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form'

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-(--auth-foreground) text-xl font-bold">
        Esqueceu sua senha?
      </h1>
      <p className="text-(--auth-foreground-muted) mb-6 text-sm">
        Informe seu email para receber o link de redefinição
      </p>
      <Suspense>
        <ForgotPasswordForm />
      </Suspense>
      <p className="text-(--auth-foreground-muted) mt-4 text-center text-sm">
        Lembrou?{' '}
        <Link href="/login" className="text-accent-500 hover:text-accent-400">
          Voltar ao login
        </Link>
      </p>
    </>
  )
}
