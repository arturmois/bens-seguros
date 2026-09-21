import Link from 'next/link'
import { Suspense } from 'react'
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form'

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="font-bold text-(--auth-foreground) text-xl">
        Esqueceu sua senha?
      </h1>
      <p className="mb-6 text-(--auth-foreground-muted) text-sm">
        Informe seu email para receber o link de redefinição
      </p>
      <Suspense>
        <ForgotPasswordForm />
      </Suspense>
      <p className="mt-4 text-center text-(--auth-foreground-muted) text-sm">
        Lembrou?{' '}
        <Link href="/login" className="text-accent-500 hover:text-accent-400">
          Voltar ao login
        </Link>
      </p>
    </>
  )
}
