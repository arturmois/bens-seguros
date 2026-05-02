'use client'

import { useRouter } from 'next/navigation'

import { PageBreadcrumb } from '@/components/page-breadcrumb'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ContactForm } from '@/features/contacts/components/contact-form'

export default function NewContactPage() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <PageBreadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Contatos', href: '/contacts' },
            { label: 'Novo contato' },
          ]}
        />

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Novo contato
          </h1>
          <p className="text-muted-foreground text-sm">
            CPF/CNPJ é opcional — você pode promover a cliente depois.
          </p>
        </div>
      </div>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Dados do contato</CardTitle>
          <CardDescription>
            Preencha as informações para registrar o contato.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContactForm
            mode="create"
            onSuccess={(contactId) => router.push(`/contacts/${contactId}`)}
            onCancel={() => router.push('/contacts')}
          />
        </CardContent>
      </Card>
    </div>
  )
}
