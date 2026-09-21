import { RegisterForm } from '@/features/auth/components/register-form'
import Link from 'next/link'
import { Suspense } from 'react'

export default function RegisterPage() {
  return (
    <>
      <h1 className="font-bold text-(--auth-foreground) text-xl">
        Criar conta
      </h1>
      <p className="mb-6 text-(--auth-foreground-muted) text-sm">
        Comece a usar o Bens Seguros
      </p>
      <Suspense>
        <RegisterForm />
      </Suspense>
      <p className="mt-4 text-center text-(--auth-foreground-muted) text-sm">
        Já tem conta?{' '}
        <Link href="/login" className="text-accent-500 hover:text-accent-400">
          Entrar
        </Link>
      </p>
    </>
  )
}
