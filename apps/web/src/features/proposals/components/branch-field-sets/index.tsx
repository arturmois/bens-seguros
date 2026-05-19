'use client'

import { Textarea } from '@/components/ui/textarea'

export { AutoFields } from './auto-fields'
export { FieldWrapper } from './field-wrapper'
export { LifeFields } from './life-fields'
export type { FieldHelperProps } from './types'

import { FieldWrapper } from './field-wrapper'
import type { FieldHelperProps } from './types'

export function OtherFields({ register }: FieldHelperProps) {
  return (
    <FieldWrapper label="Descrição" name="description" required>
      <Textarea
        placeholder="Descreva o objeto segurado"
        {...register('description')}
      />
    </FieldWrapper>
  )
}
