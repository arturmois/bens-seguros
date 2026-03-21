'use client';

import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { InputMask } from '@react-input/mask';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { documentMask, PHONE_MASK } from '@/lib/masks';

import { EMPTY_FORM_VALUES, MARITAL_OPTIONS, TYPE_OPTIONS } from '../lib/constants';
import { clientFormSchema } from '../lib/schemas';
import type { ClientFormValues } from '../lib/schemas';
import { useCreateClient, useUpdateClient } from '../hooks/use-clients';
import { FormField } from './form-field';

const MARITAL_SELECT_OPTIONS = [{ value: '', label: 'Selecione' }, ...MARITAL_OPTIONS] as const;

interface ClientFormProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly defaultValues?: ClientFormValues;
  readonly clientId?: string;
}

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

export function ClientForm({ open, onOpenChange, defaultValues, clientId }: ClientFormProps) {
  const isEditMode = Boolean(clientId);
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const isPending = createClient.isPending || updateClient.isPending;

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: defaultValues ?? EMPTY_FORM_VALUES,
  });

  useEffect(() => {
    if (!open) return;
    form.reset(defaultValues ?? EMPTY_FORM_VALUES);
  }, [open, defaultValues, form]);

  function handleSubmit(values: ClientFormValues) {
    if (isEditMode && clientId) {
      updateClient.mutate({ id: clientId, values }, { onSuccess: () => onOpenChange(false) });
      return;
    }
    createClient.mutate(values, {
      onSuccess: () => onOpenChange(false),
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEditMode ? 'Editar Cliente' : 'Novo Cliente'}</SheetTitle>
          <SheetDescription>
            {isEditMode
              ? 'Atualize as informacoes do cliente.'
              : 'Preencha os dados para cadastrar um novo cliente.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="mt-6 space-y-4">
          <FormField label="Nome" error={form.formState.errors.name?.message} required>
            <Input placeholder="Nome completo" {...form.register('name')} />
          </FormField>

          <FormField
            label="Documento (CPF/CNPJ)"
            error={form.formState.errors.document?.message}
            required
          >
            <Controller
              name="document"
              control={form.control}
              render={({ field }) => (
                <InputMask
                  component={Input}
                  mask={documentMask(field.value ?? '').mask}
                  replacement={documentMask(field.value ?? '').replacement}
                  placeholder="000.000.000-00"
                  disabled={isEditMode}
                  {...field}
                />
              )}
            />
          </FormField>

          <FormField label="Tipo" error={form.formState.errors.type?.message}>
            <Controller
              name="type"
              control={form.control}
              render={({ field }) => (
                <NativeSelect
                  options={TYPE_OPTIONS}
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      field.onChange(val);
                    }
                  }}
                />
              )}
            />
          </FormField>

          <FormField label="E-mail" error={form.formState.errors.email?.message}>
            <Input type="email" placeholder="email@exemplo.com" {...form.register('email')} />
          </FormField>

          <FormField label="Telefone" error={form.formState.errors.phone?.message}>
            <Controller
              name="phone"
              control={form.control}
              render={({ field }) => (
                <InputMask
                  component={Input}
                  mask={PHONE_MASK.mask}
                  replacement={PHONE_MASK.replacement}
                  placeholder="(00) 00000-0000"
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />
          </FormField>

          <FormField label="Data de Nascimento" error={form.formState.errors.birthDate?.message}>
            <Controller
              name="birthDate"
              control={form.control}
              render={({ field }) => (
                <DatePicker
                  value={parseDateString(field.value)}
                  onChange={(date) => field.onChange(formatDateToISO(date))}
                />
              )}
            />
          </FormField>

          <FormField label="Profissao" error={form.formState.errors.profession?.message}>
            <Input placeholder="Profissao" {...form.register('profession')} />
          </FormField>

          <FormField label="Estado Civil" error={form.formState.errors.maritalStatus?.message}>
            <Controller
              name="maritalStatus"
              control={form.control}
              render={({ field }) => (
                <NativeSelect
                  options={MARITAL_SELECT_OPTIONS}
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      field.onChange(val);
                      return;
                    }
                    field.onChange(undefined);
                  }}
                />
              )}
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? 'Salvar' : 'Criar Cliente'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
