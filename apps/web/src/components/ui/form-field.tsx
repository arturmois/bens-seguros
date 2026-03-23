import { Label } from '@/components/ui/label'

interface FormFieldProps {
  readonly label: string
  readonly error?: string
  readonly required?: boolean
  readonly helperText?: string
  readonly children: React.ReactNode
}

export function FormField({
  label,
  error,
  required,
  helperText,
  children,
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div aria-required={required || undefined}>{children}</div>
      {helperText && !error && (
        <p className="text-muted-foreground text-sm">{helperText}</p>
      )}
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  )
}
