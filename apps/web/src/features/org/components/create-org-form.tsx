'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { authClient } from '@/lib/auth-client'
import { setActiveOrgCookie } from '@/lib/org-cookie'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

const createOrgSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  slug: z
    .string()
    .min(3, 'Mínimo 3 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífens'),
})

type CreateOrgFormData = z.infer<typeof createOrgSchema>

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function CreateOrgForm() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [slugError, setSlugError] = useState('')
  const form = useForm<CreateOrgFormData>({
    resolver: zodResolver(createOrgSchema),
    defaultValues: { name: '', slug: '' },
  })
  const nameValue = form.watch('name')
  useEffect(() => {
    if (nameValue) {
      form.setValue('slug', slugify(nameValue), { shouldValidate: true })
    }
  }, [nameValue, form])
  const onSubmit = async (data: CreateOrgFormData) => {
    setIsSubmitting(true)
    setSlugError('')
    try {
      const createRes = await authClient.organization.create({
        name: data.name,
        slug: data.slug,
      })
      if (createRes.error) {
        const message = createRes.error.message ?? 'Erro ao criar organização'
        const isSlugTaken =
          message.toLowerCase().includes('slug') ||
          message.toLowerCase().includes('already') ||
          message.toLowerCase().includes('existe')
        if (isSlugTaken) {
          setSlugError('Este slug já está em uso. Escolha outro.')
          return
        }
        toast.error(message)
        return
      }
      const orgId = createRes.data?.id
      if (orgId) {
        await authClient.organization.setActive({ organizationId: orgId })
        setActiveOrgCookie(orgId)
      }
      queryClient.invalidateQueries({ queryKey: ['auth'] })
      queryClient.invalidateQueries({ queryKey: ['orgs'] })
      router.push('/dashboard')
    } catch {
      toast.error('Erro ao criar organização')
    } finally {
      setIsSubmitting(false)
    }
  }
  return (
    <div className="bg-card rounded-lg border p-8 shadow-sm">
      <div className="mb-6 text-center">
        <p className="text-primary text-sm font-semibold uppercase tracking-wide">
          Passo 2 de 2
        </p>
        <h2 className="mt-1 text-xl font-semibold">Configure sua corretora</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Estas informações podem ser alteradas depois
        </p>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome da corretora *</Label>
          <Input
            {...form.register('name')}
            id="name"
            placeholder="Ex: Corretora ABC Seguros"
          />
          {form.formState.errors.name && (
            <p className="text-destructive text-sm">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Identificador (slug)</Label>
          <div className="flex items-center overflow-hidden rounded-md border">
            <span className="bg-muted text-muted-foreground border-r px-3 py-2 text-sm">
              bens.app/
            </span>
            <Input
              {...form.register('slug', {
                onChange: () => setSlugError(''),
              })}
              id="slug"
              className="rounded-none border-0"
            />
          </div>
          <p className="text-muted-foreground text-xs">
            Gerado automaticamente. Pode ser editado.
          </p>
          {form.formState.errors.slug && (
            <p className="text-destructive text-sm">
              {form.formState.errors.slug.message}
            </p>
          )}
          {slugError && <p className="text-destructive text-sm">{slugError}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" /> Criando...
            </>
          ) : (
            'Criar corretora'
          )}
        </Button>
        <p className="text-muted-foreground text-center text-xs">
          Você será o administrador (Owner) desta organização
        </p>
      </form>
    </div>
  )
}
