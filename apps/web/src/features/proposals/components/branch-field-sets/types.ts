import type { Control, FieldValues, UseFormRegister } from 'react-hook-form'

export interface FieldHelperProps {
  register: UseFormRegister<FieldValues>
  control: Control<FieldValues>
}
