import Link from 'next/link'
import { Suspense } from 'react'
import { ResetPasswordForm } from '@/features/auth/components/reset-password-form'

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="text-(--auth-foreground) text-xl font-bold">
        Redefinir senha
      </h1>
      <p className="text-(--auth-foreground-muted) mb-6 text-sm">
        Escolha uma nova senha para sua conta
      </p>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
      <p className="text-(--auth-foreground-muted) mt-4 text-center text-sm">
        <Link href="/login" className="text-accent-500 hover:text-accent-400">
          Voltar ao login
        </Link>
      </p>
    </>
  )
}
