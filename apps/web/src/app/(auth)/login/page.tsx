import Link from 'next/link';
import { LoginForm } from '@/features/auth/components/login-form';

export default function LoginPage() {
  return (
    <>
      <LoginForm />
      <p className="text-muted-foreground mt-4 text-center text-sm">
        Nao tem conta?{' '}
        <Link href="/register" className="text-primary hover:underline">
          Cadastre-se
        </Link>
      </p>
    </>
  );
}
