'use client'

import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { FormField } from '@/components/shared/form-field'

import { ENDORSEMENT_TYPE_OPTIONS } from '../lib/constants'
import { useCreateEndorsement } from '../hooks/use-endorsements'

const endorsementFormSchema = z.object({
  type: z
    .string({ required_error: 'Tipo é obrigatório' })
    .min(1, 'Tipo é obrigatório'),
  description: z
    .string({ required_error: 'Descrição é obrigatória' })
    .min(1, 'Descrição é obrigatória'),
  effectiveDate: z
    .string({ required_error: 'Data efetiva é obrigatória' })
    .min(1, 'Data efetiva é obrigatória'),
  previousVersionSnapshot: z.string().optional().or(z.literal('')),
  changes: z.string().optional().or(z.literal('')),
})

type EndorsementFormValues = z.infer<typeof endorsementFormSchema>

const EMPTY_VALUES: EndorsementFormValues = {
  type: '',
  description: '',
  effectiveDate: '',
  previousVersionSnapshot: '',
  changes: '',
}

interface EndorsementFormProps {
  readonly policyId: string
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

function parseDateString(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date
}

function formatDateToISO(date: Date | undefined): string {
  if (!date) return ''
  return date.toISOString().slice(0, 10)
}

function parseJsonSafe(value: string): Record<string, unknown> {
  if (!value.trim()) return {}
  try {
    const parsed: unknown = JSON.parse(value)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      return parsed as Record<string, unknown>
    }
    return {}
  } catch {
    return {}
  }
}

export function EndorsementForm({
  policyId,
  open,
  onOpenChange,
}: EndorsementFormProps) {
  const createEndorsement = useCreateEndorsement()
  const form = useForm<EndorsementFormValues>({
    resolver: zodResolver(endorsementFormSchema),
    defaultValues: EMPTY_VALUES,
  })

  useEffect(() => {
    if (!open) return
    form.reset(EMPTY_VALUES)
  }, [open, form])

  function handleSubmit(values: EndorsementFormValues) {
    createEndorsement.mutate(
      {
        policyId,
        type: values.type,
        description: values.description,
        effectiveDate: values.effectiveDate,
        previousVersionSnapshot: parseJsonSafe(
          values.previousVersionSnapshot ?? ''
        ),
        changes: parseJsonSafe(values.changes ?? ''),
      },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Novo Endosso</SheetTitle>
          <SheetDescription>
            Registre um novo endosso para esta apólice.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="mt-6 space-y-4 px-6"
        >
          <FormField
            label="Tipo"
            error={form.formState.errors.type?.message}
            required
          >
            <Controller
              name="type"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    if (v !== null) field.onChange(v)
                  }}
                  items={ENDORSEMENT_TYPE_OPTIONS}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENDORSEMENT_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <FormField
            label="Descrição"
            error={form.formState.errors.description?.message}
            required
          >
            <Textarea
              placeholder="Descreva o endosso..."
              rows={3}
              {...form.register('description')}
            />
          </FormField>

          <FormField
            label="Data Efetiva"
            error={form.formState.errors.effectiveDate?.message}
            required
          >
            <Controller
              name="effectiveDate"
              control={form.control}
              render={({ field }) => (
                <DatePicker
                  value={parseDateString(field.value)}
                  onChange={(date) => field.onChange(formatDateToISO(date))}
                />
              )}
            />
          </FormField>

          <FormField label="Dados Anteriores (JSON)">
            <Textarea
              placeholder='{"campo": "valor_anterior"}'
              rows={3}
              {...form.register('previousVersionSnapshot')}
            />
          </FormField>

          <FormField label="Alterações (JSON)">
            <Textarea
              placeholder='{"campo": "novo_valor"}'
              rows={3}
              {...form.register('changes')}
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createEndorsement.isPending}>
              {createEndorsement.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Registrar
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
