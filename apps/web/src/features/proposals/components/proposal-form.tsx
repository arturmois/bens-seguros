'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

import { useCreateProposal } from '../hooks/use-proposals';
import { BOARD_TYPE_LABELS, BOARD_TYPES, BRANCH_LABELS, BRANCHES } from '../types';

const proposalFormSchema = z.object({
  clientId: z.string().min(1, 'Cliente é obrigatório'),
  branch: z.string().min(1, 'Ramo é obrigatório'),
  boardType: z.string().min(1, 'Tipo é obrigatório'),
  premiumValueInCents: z.coerce.number().int().min(0).optional(),
  commissionPercentageInCents: z.coerce.number().int().min(0).max(10000).optional(),
});

type ProposalFormValues = z.infer<typeof proposalFormSchema>;

interface ProposalFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProposalForm({ open, onOpenChange }: ProposalFormProps) {
  const createMutation = useCreateProposal();

  const form = useForm<ProposalFormValues>({
    resolver: zodResolver(proposalFormSchema),
    defaultValues: {
      clientId: '',
      branch: '',
      boardType: '',
      premiumValueInCents: undefined,
      commissionPercentageInCents: undefined,
    },
  });

  const handleSubmit = (values: ProposalFormValues) => {
    createMutation.mutate(values, {
      onSuccess: () => {
        form.reset();
        onOpenChange(false);
      },
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle>Nova Proposta</SheetTitle>
          <SheetDescription>Preencha os dados para criar uma nova proposta.</SheetDescription>
        </SheetHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-4">
          <Controller
            control={form.control}
            name="clientId"
            render={({ field, fieldState }) => (
              <Field invalid={Boolean(fieldState.error)}>
                <FieldLabel>Cliente</FieldLabel>
                <Input placeholder="ID do cliente" {...field} />
                {fieldState.error?.message ? (
                  <FieldError>{fieldState.error.message}</FieldError>
                ) : null}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="branch"
            render={({ field, fieldState }) => (
              <Field invalid={Boolean(fieldState.error)}>
                <FieldLabel>Ramo</FieldLabel>
                <Select
                  onValueChange={(v) => {
                    if (v !== null) field.onChange(v);
                  }}
                  value={field.value}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o ramo" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRANCHES.map((b) => (
                      <SelectItem key={b} value={b}>
                        {BRANCH_LABELS[b]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.error?.message ? (
                  <FieldError>{fieldState.error.message}</FieldError>
                ) : null}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="boardType"
            render={({ field, fieldState }) => (
              <Field invalid={Boolean(fieldState.error)}>
                <FieldLabel>Tipo</FieldLabel>
                <Select
                  onValueChange={(v) => {
                    if (v !== null) field.onChange(v);
                  }}
                  value={field.value}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {BOARD_TYPES.map((bt) => (
                      <SelectItem key={bt} value={bt}>
                        {BOARD_TYPE_LABELS[bt]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.error?.message ? (
                  <FieldError>{fieldState.error.message}</FieldError>
                ) : null}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="premiumValueInCents"
            render={({ field, fieldState }) => (
              <Field invalid={Boolean(fieldState.error)}>
                <FieldLabel>Valor do Prêmio (centavos)</FieldLabel>
                <Input
                  type="number"
                  placeholder="Ex: 150000"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
                {fieldState.error?.message ? (
                  <FieldError>{fieldState.error.message}</FieldError>
                ) : null}
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="commissionPercentageInCents"
            render={({ field, fieldState }) => (
              <Field invalid={Boolean(fieldState.error)}>
                <FieldLabel>Comissão (pontos base, 0-10000)</FieldLabel>
                <Input
                  type="number"
                  placeholder="Ex: 1500 = 15%"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
                {fieldState.error?.message ? (
                  <FieldError>{fieldState.error.message}</FieldError>
                ) : null}
              </Field>
            )}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Criando...' : 'Criar Proposta'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
