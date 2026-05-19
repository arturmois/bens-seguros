'use client'

import { useFormContext } from 'react-hook-form'

import { Label } from '@/components/ui/label'

interface FormFieldProps {
  readonly label: string
  readonly name?: string
  readonly required?: boolean
  readonly hint?: string
  readonly children: React.ReactNode
}

function readErrorMessage(
  errors: Record<string, unknown>,
  name: string
): string | undefined {
  const entry = errors[name]
  if (!entry || typeof entry !== 'object') return undefined
  const message = (entry as { message?: unknown }).message
  return typeof message === 'string' ? message : undefined
}

export function FieldWrapper({
  label,
  name,
  required,
  hint,
  children,
}: FormFieldProps) {
  const context = useFormContext()
  const errorMessage =
    context && name
      ? readErrorMessage(
          context.formState.errors as Record<string, unknown>,
          name
        )
      : undefined
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {errorMessage ? (
        <p role="alert" className="text-destructive text-xs">
          {errorMessage}
        </p>
      ) : (
        hint && <p className="text-muted-foreground text-xs">{hint}</p>
      )}
    </div>
  )
}
