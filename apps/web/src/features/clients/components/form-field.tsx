'use client'

import { cloneElement, isValidElement, useId } from 'react'

import { Label } from '@/components/ui/label'

interface FormFieldProps {
  readonly label: string
  readonly error?: string
  readonly required?: boolean
  readonly children: React.ReactNode
}

export function FormField({
  label,
  error,
  required,
  children,
}: FormFieldProps) {
  const id = useId()
  const errorId = `${id}-error`

  const childProps: Record<string, string> = { id }
  if (error) {
    childProps['aria-describedby'] = errorId
    childProps['aria-invalid'] = 'true'
  }

  const enhancedChildren = isValidElement(children)
    ? cloneElement(children, childProps)
    : children

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {enhancedChildren}
      {error && (
        <p id={errorId} role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  )
}
