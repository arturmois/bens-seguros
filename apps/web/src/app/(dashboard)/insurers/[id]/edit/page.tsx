'use client'

import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { use } from 'react'

import { FormPageShell } from '@/components/shared/form-page-shell'
import { Button } from '@/components/ui/button'
import { InsurerForm } from '@/features/insurers/components/insurer-form'
import { useInsurer } from '@/features/insurers/hooks/use-insurers'

interface EditInsurerPageProps {
  readonly params: Promise<{ id: string }>
}

export default function EditInsurerPage({ params }: EditInsurerPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { data: insurer, isLoading, isError } = useInsurer(id)
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (isError || !insurer) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <p role="alert" className="text-destructive text-sm">
          Seguradora não encontrada.
        </p>
        <Button variant="link" onClick={() => router.push('/insurers')}>
          Voltar para seguradoras
        </Button>
      </div>
    )
  }
  return (
    <FormPageShell
      breadcrumb={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Seguradoras', href: '/insurers' },
        { label: insurer.name },
        { label: 'Editar' },
      ]}
      title="Editar seguradora"
      description="Atualize os dados da seguradora."
      cardTitle="Dados da seguradora"
      cardDescription="Altere os campos necessários e salve."
    >
      <InsurerForm
        mode="edit"
        initial={insurer}
        onSuccess={() => router.push('/insurers')}
        onCancel={() => router.push('/insurers')}
      />
    </FormPageShell>
  )
}
