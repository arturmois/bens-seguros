import Link from 'next/link'
import { Suspense } from 'react'
import { RegisterForm } from '@/features/auth/components/register-form'

export default function RegisterPage() {
  return (
    <>
      <h1 className="text-xl font-bold text-slate-100">Criar conta</h1>
      <p className="mb-6 text-sm text-slate-400">
        Comece a usar o Bens Seguros
      </p>
      <Suspense>
        <RegisterForm />
      </Suspense>
      <p className="mt-4 text-center text-sm text-slate-400">
        Ja tem conta?{' '}
        <Link href="/login" className="text-accent-500 hover:text-accent-400">
          Entrar
        </Link>
      </p>
    </>
  )
}
