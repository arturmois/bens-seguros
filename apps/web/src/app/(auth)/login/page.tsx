import { LoginForm } from '@/features/auth/components/login-form'
import Link from 'next/link'
import { Suspense } from 'react'

export default function LoginPage() {
  return (
    <>
      <h1 className="text-(--auth-foreground) text-xl font-bold">Entrar</h1>
      <p className="text-(--auth-foreground-muted) mb-6 text-sm">
        Acesse sua corretora
      </p>
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="text-(--auth-foreground-muted) mt-4 text-center text-sm">
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
