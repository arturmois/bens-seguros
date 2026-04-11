'use client'

import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import type { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

import { CreateClaimOccurrenceBody } from '@/api/endpoints/claims/claims.zod'
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

const occurrenceFormSchema = CreateClaimOccurrenceBody.pick({
  type: true,
  description: true,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova ocorrência</DialogTitle>
          <DialogDescription>
            Registre uma nova ocorrência para este sinistro.
          </DialogDescription>
        </DialogHeader>

        <DialogPanel>
          <form
            id="occurrence-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
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
                      <SelectValue placeholder="Selecione o tipo">
                        {(value: string) =>
                          OCCURRENCE_TYPE_OPTIONS.find(
                            (opt) => opt.value === value
                          )?.label ?? null
                        }
                      </SelectValue>
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
          </form>
        </DialogPanel>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="occurrence-form"
            disabled={createOccurrence.isPending}
          >
            {createOccurrence.isPending && (
              <Loader2 className="mr-2 size-4 animate-spin" />
            )}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
