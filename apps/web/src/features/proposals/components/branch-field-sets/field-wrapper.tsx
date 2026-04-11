'use client'

import { Label } from '@/components/ui/label'

interface FormFieldProps {
  readonly label: string
  readonly required?: boolean
  readonly hint?: string
  readonly children: React.ReactNode
}

export function FieldWrapper({
  label,
  required,
  hint,
  children,
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  )
}
