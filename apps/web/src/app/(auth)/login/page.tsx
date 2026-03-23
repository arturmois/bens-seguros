import Link from 'next/link'
import { Suspense } from 'react'
import { LoginForm } from '@/features/auth/components/login-form'

export default function LoginPage() {
  return (
    <>
      <h1 className="text-xl font-bold text-slate-100">Entrar</h1>
      <p className="mb-6 text-sm text-slate-400">Acesse sua corretora</p>
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="mt-4 text-center text-sm text-slate-400">
        Nao tem conta?{' '}
        <Link
          href="/register"
          className="text-accent-500 hover:text-accent-400"
        >
          Cadastre-se
        </Link>
      </p>
    </>
  )
}
