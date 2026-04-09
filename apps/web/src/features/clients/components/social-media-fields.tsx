'use client'

import { ChevronDown } from 'lucide-react'
import { useFormContext } from 'react-hook-form'

import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { useIsMobile } from '@/hooks/use-mobile'

import type { ClientFormValues } from '../lib/types'
import { FormField } from './form-field'

interface SocialMediaFieldsProps {
  readonly isReadOnly?: boolean
}

function SocialMediaGrid({ isReadOnly }: SocialMediaFieldsProps) {
  const form = useFormContext<ClientFormValues>()

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2 lg:grid-cols-4">
      <FormField
        label="Instagram"
        error={form.formState.errors.socialMedia?.instagram?.message}
      >
        <Input
          placeholder="@perfil"
          disabled={isReadOnly}
          {...form.register('socialMedia.instagram')}
        />
      </FormField>

      <FormField
        label="Facebook"
        error={form.formState.errors.socialMedia?.facebook?.message}
      >
        <Input
          placeholder="URL ou nome do perfil"
          disabled={isReadOnly}
          {...form.register('socialMedia.facebook')}
        />
      </FormField>

      <FormField
        label="LinkedIn"
        error={form.formState.errors.socialMedia?.linkedin?.message}
      >
        <Input
          placeholder="URL do perfil"
          disabled={isReadOnly}
          {...form.register('socialMedia.linkedin')}
        />
      </FormField>

      <FormField
        label="TikTok"
        error={form.formState.errors.socialMedia?.tiktok?.message}
      >
        <Input
          placeholder="@perfil"
          disabled={isReadOnly}
          {...form.register('socialMedia.tiktok')}
        />
      </FormField>
    </div>
  )
}

export function SocialMediaFields({ isReadOnly }: SocialMediaFieldsProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Collapsible defaultOpen={false}>
        <section>
          <CollapsibleTrigger className="flex w-full items-center justify-between">
            <h2 className="text-muted-foreground text-sm font-semibold">
              Redes Sociais
            </h2>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" size="sm">
                Opcional
              </Badge>
              <ChevronDown className="text-muted-foreground size-4 transition-transform duration-200 [[data-panel-open]_&]:rotate-180" />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="pt-4">
              <SocialMediaGrid isReadOnly={isReadOnly} />
            </div>
          </CollapsibleContent>
        </section>
      </Collapsible>
    )
  }

  return (
    <section>
      <h2 className="text-muted-foreground mb-4 text-sm font-semibold">
        Redes Sociais
      </h2>
      <SocialMediaGrid isReadOnly={isReadOnly} />
    </section>
  )
}
