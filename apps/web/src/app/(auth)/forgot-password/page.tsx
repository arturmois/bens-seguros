import Link from 'next/link'
import { Suspense } from 'react'
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form'

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-xl font-bold text-slate-100">Esqueceu sua senha?</h1>
      <p className="mb-6 text-sm text-slate-400">
        Informe seu email para receber o link de redefinição
      </p>
      <Suspense>
        <ForgotPasswordForm />
      </Suspense>
      <p className="mt-4 text-center text-sm text-slate-400">
        Lembrou?{' '}
        <Link href="/login" className="text-accent-500 hover:text-accent-400">
          Voltar ao login
        </Link>
      </p>
    </>
  )
}
