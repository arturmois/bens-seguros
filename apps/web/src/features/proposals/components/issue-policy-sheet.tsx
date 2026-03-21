'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

import { FormField } from '@/components/shared/form-field';
import { useIssuePolicy } from '@/features/policies/hooks/use-policies';

const issuePolicySchema = z.object({
  policyNumber: z
    .string({ required_error: 'Numero da apolice e obrigatorio' })
    .min(1, 'Numero da apolice e obrigatorio'),
  startDate: z
    .string({ required_error: 'Data de inicio e obrigatoria' })
    .min(1, 'Data de inicio e obrigatoria'),
  endDate: z
    .string({ required_error: 'Data de fim e obrigatoria' })
    .min(1, 'Data de fim e obrigatoria'),
});

type IssuePolicyFormValues = z.infer<typeof issuePolicySchema>;

const EMPTY_VALUES: IssuePolicyFormValues = {
  policyNumber: '',
  startDate: '',
  endDate: '',
};

interface IssuePolicySheetProps {
  readonly proposalId: string;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function IssuePolicySheet({ proposalId, open, onOpenChange }: IssuePolicySheetProps) {
  const router = useRouter();
  const issuePolicy = useIssuePolicy();

  const form = useForm<IssuePolicyFormValues>({
    resolver: zodResolver(issuePolicySchema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (!open) return;
    form.reset(EMPTY_VALUES);
  }, [open, form]);

  function handleSubmit(values: IssuePolicyFormValues) {
    issuePolicy.mutate(
      { proposalId, ...values },
      {
        onSuccess: (policy) => {
          onOpenChange(false);
          router.push(`/policies/${policy.id}`);
        },
      },
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Emitir Apolice</SheetTitle>
          <SheetDescription>
            Preencha os dados para emitir a apolice vinculada a esta proposta.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="mt-6 space-y-4 px-6">
          <FormField
            label="Numero da Apolice"
            error={form.formState.errors.policyNumber?.message}
            required
          >
            <Input placeholder="Ex: AUTO-2026-001" {...form.register('policyNumber')} />
          </FormField>

          <FormField
            label="Inicio da Vigencia"
            error={form.formState.errors.startDate?.message}
            required
          >
            <Input type="date" {...form.register('startDate')} />
          </FormField>

          <FormField
            label="Fim da Vigencia"
            error={form.formState.errors.endDate?.message}
            required
          >
            <Input type="date" {...form.register('endDate')} />
          </FormField>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={issuePolicy.isPending}>
              {issuePolicy.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Emitir Apolice
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
