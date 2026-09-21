'use client'

import { Loader2, NotebookPen } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

import { useUpdateProposalObservations } from '../hooks/use-proposals'

interface ProposalObservationsProps {
  proposalId: string
  initialValue: string | null
}

const MAX_LENGTH = 2000

export function ProposalObservations({
  proposalId,
  initialValue,
}: ProposalObservationsProps) {
  const [value, setValue] = useState(initialValue ?? '')
  const mutation = useUpdateProposalObservations()
  const initial = initialValue ?? ''
  const isDirty = value.trim() !== initial.trim()
  function handleSave() {
    const trimmed = value.trim()
    mutation.mutate({
      id: proposalId,
      observations: trimmed === '' ? null : trimmed,
    })
  }
  function handleCancel() {
    setValue(initial)
  }
  return (
    <section
      aria-labelledby="proposal-observations-label"
      className="space-y-2"
    >
      <div className="flex items-center gap-2">
        <NotebookPen className="h-4 w-4 text-muted-foreground" />
        <h3 id="proposal-observations-label" className="font-semibold text-sm">
          Observações
        </h3>
      </div>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Adicione uma observação..."
        rows={4}
        maxLength={MAX_LENGTH}
        disabled={mutation.isPending}
      />
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs tabular-nums">
          {value.length}/{MAX_LENGTH}
        </span>
        <div className="flex gap-2">
          {isDirty && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || mutation.isPending}
          >
            {mutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Salvar
          </Button>
        </div>
      </div>
    </section>
  )
}
