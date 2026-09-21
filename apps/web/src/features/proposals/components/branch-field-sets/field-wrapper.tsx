'use client'

import { cloneElement, isValidElement, useId } from 'react'
import { useFormContext } from 'react-hook-form'

import { Label } from '@/components/ui/label'

type FieldWrapperChildren =
  | React.ReactElement<{ id?: string; 'aria-describedby'?: string }>
  | ((id: string) => React.ReactNode)

interface FormFieldProps {
  readonly label: string
  readonly name?: string
  readonly required?: boolean
  readonly hint?: string
  readonly children: FieldWrapperChildren
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
  const generatedId = useId()
  const errorId = `${generatedId}-error`

  const context = useFormContext()
  const errorMessage =
    context && name
      ? readErrorMessage(
          context.formState.errors as Record<string, unknown>,
          name
        )
      : undefined

  function renderChild(): React.ReactNode {
    if (typeof children === 'function') return children(generatedId)
    if (isValidElement(children)) {
      const childProps: Record<string, string> = { id: generatedId }
      if (errorMessage) {
        childProps['aria-describedby'] = errorId
      }
      return cloneElement(children, childProps)
    }
    return children
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={generatedId}>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {renderChild()}
      {errorMessage ? (
        <p id={errorId} role="alert" className="text-destructive text-xs">
          {errorMessage}
        </p>
      ) : (
        hint && <p className="text-muted-foreground text-xs">{hint}</p>
      )}
    </div>
  )
}
