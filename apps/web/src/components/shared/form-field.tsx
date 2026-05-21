'use client'

import { cloneElement, isValidElement, useId } from 'react'

import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type FormFieldChildren = React.ReactNode | ((id: string) => React.ReactNode)

type FormFieldSpan = 'full' | 2 | 1

const SPAN_CLASS: Record<FormFieldSpan, string> = {
  full: 'col-span-full',
  2: 'col-span-2',
  1: '',
}

interface FormFieldProps {
  readonly label: string
  readonly error?: string
  readonly required?: boolean
  readonly hint?: string
  readonly span?: FormFieldSpan
  readonly children: FormFieldChildren
}

function renderChildren(
  children: FormFieldChildren,
  id: string,
  errorId: string | null
): React.ReactNode {
  if (typeof children === 'function') return children(id)
  if (!isValidElement(children)) return children
  const childProps: Record<string, string> = { id }
  if (errorId) {
    childProps['aria-describedby'] = errorId
    childProps['aria-invalid'] = 'true'
  }
  return cloneElement(children, childProps)
}

export function FormField({
  label,
  error,
  required,
  hint,
  span = 1,
  children,
}: FormFieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const content = renderChildren(children, id, error ? errorId : null)
  return (
    <div className={cn('space-y-2', SPAN_CLASS[span])}>
      <div className="flex items-baseline justify-between">
        <Label htmlFor={id}>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {hint && (
          <span className="text-success text-xs font-medium">{hint}</span>
        )}
      </div>
      {content}
      {error && (
        <p id={errorId} role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  )
}
