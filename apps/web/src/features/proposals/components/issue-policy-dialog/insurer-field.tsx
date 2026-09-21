'use client'

import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Controller, type Control, type UseFormSetValue } from 'react-hook-form'

import { useListInsurers } from '@/api/endpoints/insurers/insurers'
import { ListInsurersActive, type ListInsurers200DataItem } from '@/api/model'
import { FormField } from '@/components/shared/form-field'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { InsurerFormDialog } from '@/features/insurers/components/insurer-form-dialog'

import type { IssuePolicyFormValues } from './types'

interface InsurerFieldProps {
  readonly control: Control<IssuePolicyFormValues>
  readonly setValue: UseFormSetValue<IssuePolicyFormValues>
  readonly error?: string
}

export function InsurerField({ control, setValue, error }: InsurerFieldProps) {
  const {
    data: insurersResponse,
    isLoading: insurersLoading,
    isError: insurersError,
  } = useListInsurers({ active: ListInsurersActive.true })
  const [insurerDialogOpen, setInsurerDialogOpen] = useState(false)
  const [createdInsurer, setCreatedInsurer] =
    useState<ListInsurers200DataItem | null>(null)
  const insurers = insurersResponse?.data.data ?? []
  const visibleInsurers = useMemo(() => {
    if (!createdInsurer) return insurers
    if (insurers.some((insurer) => insurer.id === createdInsurer.id)) {
      return insurers
    }
    return [createdInsurer, ...insurers]
  }, [createdInsurer, insurers])
  function handleInsurerCreated(insurer: ListInsurers200DataItem) {
    setCreatedInsurer(insurer)
    setValue('insurerId', insurer.id, { shouldValidate: true })
    setInsurerDialogOpen(false)
  }
  const showEmpty =
    !insurersLoading && !insurersError && visibleInsurers.length === 0
  return (
    <>
      <FormField label="Seguradora" error={error} required>
        {showEmpty ? (
          <div className="space-y-3 rounded-lg border border-border border-dashed bg-muted/20 p-4">
            <div>
              <p className="font-medium">Nenhuma seguradora ativa cadastrada</p>
              <p className="text-muted-foreground text-sm">
                Cadastre uma seguradora para concluir a emissão da apólice.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setInsurerDialogOpen(true)}
            >
              <Plus className="mr-2 size-4" />
              Cadastrar seguradora
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Controller
              name="insurerId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a seguradora">
                      {(value: string | null) => {
                        const item = visibleInsurers.find(
                          (insurer) => insurer.id === value
                        )
                        return item?.name ?? null
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {visibleInsurers.map((insurer) => (
                      <SelectItem key={insurer.id} value={insurer.id}>
                        {insurer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setInsurerDialogOpen(true)}
              >
                <Plus className="mr-2 size-4" />
                Nova seguradora
              </Button>
            </div>
          </div>
        )}
      </FormField>
      <InsurerFormDialog
        open={insurerDialogOpen}
        onOpenChange={setInsurerDialogOpen}
        onSuccess={handleInsurerCreated}
      />
    </>
  )
}
