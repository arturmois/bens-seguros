'use client'

import { Textarea } from '@/components/ui/textarea'

export type { FieldHelperProps } from './types'
export { FieldWrapper } from './field-wrapper'
export { AutoFields } from './auto-fields'
export { LifeFields } from './life-fields'

import type { FieldHelperProps } from './types'
import { FieldWrapper } from './field-wrapper'

export function OtherFields({ register }: FieldHelperProps) {
  return (
    <FieldWrapper label="Descrição" required>
      <Textarea
        placeholder="Descreva o objeto segurado"
        {...register('description')}
      />
    </FieldWrapper>
  )
}
