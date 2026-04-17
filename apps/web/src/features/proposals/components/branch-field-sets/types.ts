import type {
  Control,
  FieldValues,
  UseFormRegister,
  UseFormSetValue,
} from 'react-hook-form'

export interface FieldHelperProps {
  register: UseFormRegister<FieldValues>
  control: Control<FieldValues>
  setValue: UseFormSetValue<FieldValues>
}
