import Link from 'next/link'
import { Suspense } from 'react'
import { ResetPasswordForm } from '@/features/auth/components/reset-password-form'

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="text-xl font-bold text-slate-100">Redefinir senha</h1>
      <p className="mb-6 text-sm text-slate-400">
        Escolha uma nova senha para sua conta
      </p>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
      <p className="mt-4 text-center text-sm text-slate-400">
        <Link href="/login" className="text-accent-500 hover:text-accent-400">
          Voltar ao login
        </Link>
      </p>
    </>
  )
}
