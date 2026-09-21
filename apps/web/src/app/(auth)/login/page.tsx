import { LoginForm } from '@/features/auth/components/login-form'
import Link from 'next/link'
import { Suspense } from 'react'

export default function LoginPage() {
  return (
    <>
      <h1 className="font-bold text-(--auth-foreground) text-xl">Entrar</h1>
      <p className="mb-6 text-(--auth-foreground-muted) text-sm">
        Acesse sua corretora
      </p>
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="mt-4 text-center text-(--auth-foreground-muted) text-sm">
        Não tem conta?{' '}
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
