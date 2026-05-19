'use client'

import { Loader2, NotebookPen, Pencil } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

import { useUpdateProposalObservations } from '../../../hooks/use-proposals'

interface InlineEditObservationsProps {
  readonly proposalId: string
  readonly initialValue: string | null
}

const MAX_LENGTH = 2000

export function InlineEditObservations({
  proposalId,
  initialValue,
}: InlineEditObservationsProps) {
  const initial = initialValue ?? ''
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initial)
  const mutation = useUpdateProposalObservations()
  const isDirty = value.trim() !== initial.trim()

  function startEditing() {
    setValue(initial)
    setEditing(true)
  }

  function handleCancel() {
    setValue(initial)
    setEditing(false)
  }

  function handleSave() {
    const trimmed = value.trim()
    mutation.mutate(
      { id: proposalId, observations: trimmed === '' ? null : trimmed },
      {
        onSuccess: () => {
          setEditing(false)
        },
      }
    )
  }

  return (
    <section
      aria-labelledby="proposal-observations-label"
      className="bg-card rounded-xl border p-5 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <p
          id="proposal-observations-label"
          className="text-muted-foreground inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider"
        >
          <NotebookPen className="text-primary size-3.5" /> Observações
        </p>
        {!editing && (
          <button
            type="button"
            onClick={startEditing}
            aria-label="Editar observações"
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <Pencil className="size-4" />
          </button>
        )}
      </div>
      {editing ? (
        <>
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Adicione uma observação..."
            rows={4}
            maxLength={MAX_LENGTH}
            autoFocus
            disabled={mutation.isPending}
          />
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-muted-foreground tabular-nums">
              {value.length}/{MAX_LENGTH}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={mutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!isDirty || mutation.isPending}
              >
                {mutation.isPending && (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                )}
                Salvar
              </Button>
            </div>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={startEditing}
          className="bg-muted/40 hover:bg-muted/60 w-full rounded-md p-3 text-left text-sm leading-relaxed transition-colors"
        >
          {initial ? (
            <span className="text-foreground whitespace-pre-wrap">
              {initial}
            </span>
          ) : (
            <span className="text-muted-foreground italic">
              Nenhuma observação. Clique para adicionar.
            </span>
          )}
        </button>
      )}
    </section>
  )
}
