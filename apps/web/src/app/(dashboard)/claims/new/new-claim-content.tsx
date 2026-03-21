'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';

import { ClaimForm } from '@/features/claims/components/claim-form';

export function NewClaimContent() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
        <Button variant="ghost" size="sm" onClick={() => router.push('/claims')} className="gap-1">
          <ArrowLeft className="h-4 w-4" />
          Sinistros
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">Novo Sinistro</span>
      </nav>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Novo Sinistro</h1>
        <p className="text-muted-foreground text-sm">
          Preencha os dados para registrar um novo sinistro.
        </p>
      </div>

      <ClaimForm />
    </div>
  );
}
