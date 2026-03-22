'use client'

import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
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
import { useCreateOccurrence } from '../hooks/use-claims'

const OCCURRENCE_TYPE_OPTIONS = [
  { value: 'acompanhamento', label: 'Acompanhamento' },
  { value: 'comunicado', label: 'Comunicado' },
  { value: 'documento_solicitado', label: 'Documento Solicitado' },
  { value: 'vistoria', label: 'Vistoria' },
  { value: 'parecer', label: 'Parecer' },
  { value: 'outro', label: 'Outro' },
] as const

const occurrenceFormSchema = z.object({
  type: z
    .string({ required_error: 'Tipo é obrigatório' })
    .min(1, 'Tipo é obrigatório'),
  description: z
    .string({ required_error: 'Descrição é obrigatória' })
    .min(1, 'Descrição é obrigatória'),
})

type OccurrenceFormValues = z.infer<typeof occurrenceFormSchema>

const EMPTY_VALUES: OccurrenceFormValues = {
  type: '',
  description: '',
}

interface OccurrenceFormProps {
  readonly claimId: string
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

export function OccurrenceForm({
  claimId,
  open,
  onOpenChange,
}: OccurrenceFormProps) {
  const createOccurrence = useCreateOccurrence()

  const form = useForm<OccurrenceFormValues>({
    resolver: zodResolver(occurrenceFormSchema),
    defaultValues: EMPTY_VALUES,
  })

  useEffect(() => {
    if (!open) return
    form.reset(EMPTY_VALUES)
  }, [open, form])

  function handleSubmit(values: OccurrenceFormValues) {
    createOccurrence.mutate(
      { claimId, type: values.type, description: values.description },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Nova Ocorrência</SheetTitle>
          <SheetDescription>
            Registre uma nova ocorrência para este sinistro.
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
                  items={OCCURRENCE_TYPE_OPTIONS}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {OCCURRENCE_TYPE_OPTIONS.map((opt) => (
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
              placeholder="Descreva a ocorrência..."
              rows={4}
              {...form.register('description')}
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
            <Button type="submit" disabled={createOccurrence.isPending}>
              {createOccurrence.isPending && (
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
