import Link from 'next/link';
import { RegisterForm } from '@/features/auth/components/register-form';

export default function RegisterPage() {
  return (
    <>
      <RegisterForm />
      <p className="text-muted-foreground mt-4 text-center text-sm">
        Ja tem conta?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Entrar
        </Link>
      </p>
    </>
  );
}
