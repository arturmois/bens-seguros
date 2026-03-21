'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';

import { AssistanceForm } from '@/features/assistances/components/assistance-form';

export function NewAssistanceContent() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/assistances')}
          className="gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Assistencias
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">Nova Assistencia</span>
      </nav>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nova Assistencia</h1>
        <p className="text-muted-foreground text-sm">
          Preencha os dados para registrar uma nova assistencia.
        </p>
      </div>

      <AssistanceForm />
    </div>
  );
}
