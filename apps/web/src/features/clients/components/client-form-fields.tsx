'use client'

import { InputMask } from '@react-input/mask'
import { Controller, useFormContext } from 'react-hook-form'

import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { PHONE_MASK } from '@/lib/masks'

import type { ClientFormValues } from '../lib/types'
import { FormField } from '@/components/shared/form-field'
import { IdentificationFields } from './identification-fields'
import { SocialMediaFields } from './social-media-fields'

interface ClientFormFieldsProps {
  readonly isReadOnly: boolean
}

export function ClientFormFields({ isReadOnly }: ClientFormFieldsProps) {
  const form = useFormContext<ClientFormValues>()

  return (
    <div className="space-y-6">
      <IdentificationFields isReadOnly={isReadOnly} />

      <Separator />

      {/* Section: Contato */}
      <section>
        <h2 className="text-muted-foreground mb-4 text-sm font-semibold">
          Contato
        </h2>
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
          <FormField
            label="E-mail"
            error={form.formState.errors.email?.message}
          >
            <Input
              type="email"
              placeholder="email@exemplo.com"
              {...form.register('email')}
            />
          </FormField>

          <FormField
            label="Telefone"
            error={form.formState.errors.phone?.message}
          >
            <Controller
              name="phone"
              control={form.control}
              render={({ field }) => (
                <InputMask
                  component={Input}
                  mask={PHONE_MASK.mask}
                  replacement={PHONE_MASK.replacement}
                  placeholder="(00) 00000-0000"
                  {...field}
                  value={field.value ?? ''}
                />
              )}
            />
          </FormField>
        </div>
      </section>

      <Separator />

      <SocialMediaFields />
    </div>
  )
}
