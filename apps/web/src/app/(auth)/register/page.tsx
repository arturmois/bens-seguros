import { RegisterForm } from '@/features/auth/components/register-form'
import Link from 'next/link'
import { Suspense } from 'react'

export default function RegisterPage() {
  return (
    <>
      <h1 className="text-(--auth-foreground) text-xl font-bold">
        Criar conta
      </h1>
      <p className="text-(--auth-foreground-muted) mb-6 text-sm">
        Comece a usar o Bens Seguros
      </p>
      <Suspense>
        <RegisterForm />
      </Suspense>
      <p className="text-(--auth-foreground-muted) mt-4 text-center text-sm">
        Já tem conta?{' '}
        <Link href="/login" className="text-accent-500 hover:text-accent-400">
          Entrar
        </Link>
      </p>
    </>
  )
}
