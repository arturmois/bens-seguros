import type {
  Control,
  FieldValues,
  UseFormGetValues,
  UseFormRegister,
  UseFormSetValue,
} from 'react-hook-form'

export interface FieldHelperProps {
  register: UseFormRegister<FieldValues>
  control: Control<FieldValues>
  setValue: UseFormSetValue<FieldValues>
  getValues: UseFormGetValues<FieldValues>
  proposalId?: string
}
