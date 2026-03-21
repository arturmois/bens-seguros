'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { FormField } from '@/components/shared/form-field';

import { ASSISTANCE_TYPE_OPTIONS } from '../lib/constants';
import { assistanceFormSchema, EMPTY_ASSISTANCE_FORM_VALUES } from '../lib/schemas';
import type { AssistanceFormValues } from '../lib/schemas';
import { useCreateAssistance } from '../hooks/use-assistances';

function parseDateString(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

function formatDateToISO(date: Date | undefined): string {
  if (!date) return '';
  return date.toISOString().slice(0, 10);
}

export function AssistanceForm() {
  const router = useRouter();
  const createAssistance = useCreateAssistance();

  const form = useForm<AssistanceFormValues>({
    resolver: zodResolver(assistanceFormSchema),
    defaultValues: EMPTY_ASSISTANCE_FORM_VALUES,
  });

  function handleSubmit(values: AssistanceFormValues) {
    createAssistance.mutate(values, {
      onSuccess: () => router.push('/assistances'),
    });
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      <SectionHeader title="Dados" subtitle="Informacoes basicas da assistencia." />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Apolice" error={form.formState.errors.policyId?.message} required>
          <Input placeholder="ID da apolice" {...form.register('policyId')} />
        </FormField>
        <FormField label="Cliente" error={form.formState.errors.clientId?.message} required>
          <Input placeholder="ID do cliente" {...form.register('clientId')} />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Sinistro (opcional)" error={form.formState.errors.claimId?.message}>
          <Input placeholder="ID do sinistro" {...form.register('claimId')} />
        </FormField>
        <FormField label="Tipo" error={form.formState.errors.type?.message} required>
          <Controller
            name="type"
            control={form.control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(v) => {
                  if (v !== null) field.onChange(v);
                }}
                items={ASSISTANCE_TYPE_OPTIONS}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {ASSISTANCE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
      </div>

      <Separator />
      <SectionHeader title="Detalhes" subtitle="Descricao e localizacao." />

      <FormField label="Descricao" error={form.formState.errors.description?.message}>
        <Textarea
          placeholder="Descreva a assistencia..."
          rows={4}
          {...form.register('description')}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Endereco" error={form.formState.errors.address?.message}>
          <Input placeholder="Endereco do local" {...form.register('address')} />
        </FormField>
        <FormField label="Prestador" error={form.formState.errors.providerName?.message}>
          <Input placeholder="Nome do prestador" {...form.register('providerName')} />
        </FormField>
      </div>

      <FormField label="Telefone do Prestador" error={form.formState.errors.providerPhone?.message}>
        <Input placeholder="(11) 99999-9999" {...form.register('providerPhone')} />
      </FormField>

      <Separator />
      <SectionHeader title="Agendamento" subtitle="Data programada para a assistencia." />

      <FormField label="Data Agendada" error={form.formState.errors.scheduledAt?.message}>
        <Controller
          name="scheduledAt"
          control={form.control}
          render={({ field }) => (
            <DatePicker
              value={parseDateString(field.value)}
              onChange={(date) => field.onChange(formatDateToISO(date))}
            />
          )}
        />
      </FormField>

      <Separator />

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push('/assistances')}>
          Cancelar
        </Button>
        <Button type="submit" disabled={createAssistance.isPending}>
          {createAssistance.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Registrar Assistencia
        </Button>
      </div>
    </form>
  );
}

function SectionHeader({ title, subtitle }: { readonly title: string; readonly subtitle: string }) {
  return (
    <div>
      <h3 className="text-base font-medium">{title}</h3>
      <p className="text-muted-foreground text-sm">{subtitle}</p>
    </div>
  );
}
