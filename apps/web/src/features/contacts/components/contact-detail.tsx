'use client'

import { ArrowLeft, IdCard, Mail, Pencil, Phone, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog'
import { DetailInfoItem } from '@/components/shared/detail-info-item'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import { useDeleteContact } from '../hooks/use-contacts'
import { CONTACT_SOURCE_LABELS } from '../lib/constants'
import type { ContactWithStage } from '../lib/types'
import { ContactStageBadge } from './contact-stage-badge'
import { PromoteContactDialog } from './promote-contact-dialog'

interface ContactDetailProps {
  readonly contact: ContactWithStage
}

export function ContactDetail({ contact }: ContactDetailProps) {
  const router = useRouter()
  const deleteMutation = useDeleteContact()
  const [promoteOpen, setPromoteOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  function handleConfirmDelete() {
    deleteMutation.mutate(contact.id, {
      onSuccess: () => {
        setDeleteOpen(false)
        router.push('/contacts')
      },
    })
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/contacts')}
            className="-ms-2 w-fit"
          >
            <ArrowLeft className="mr-1 size-4" />
            Voltar
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {contact.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <ContactStageBadge stage={contact.stage} />
            <span className="text-muted-foreground">
              Origem: {CONTACT_SOURCE_LABELS[contact.source]}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!contact.clientId && (
            <Button onClick={() => setPromoteOpen(true)}>
              <IdCard className="mr-2 size-4" />
              Informar CPF/CNPJ
            </Button>
          )}
          <Button
            variant="outline"
            render={<Link href={`/contacts/${contact.id}/edit`} />}
          >
            <Pencil className="mr-2 size-4" />
            Editar
          </Button>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-2 size-4" />
            Excluir
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informações de contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailInfoItem
              icon={<Phone className="size-4" />}
              label="Telefone"
              value={contact.phone ?? '—'}
            />
            <DetailInfoItem
              icon={<Mail className="size-4" />}
              label="Email"
              value={contact.email ?? '—'}
            />
          </CardContent>
        </Card>
        {contact.clientId ? (
          <Card>
            <CardHeader>
              <CardTitle>Cliente vinculado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link
                href={`/clients/${contact.clientId}`}
                className="text-primary text-sm hover:underline"
              >
                Ver dados fiscais do cliente
              </Link>
              <p className="text-muted-foreground text-sm">
                {contact.activePolicyCount}{' '}
                {contact.activePolicyCount === 1
                  ? 'apólice ativa'
                  : 'apólices ativas'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Sem dados fiscais</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Este contato ainda não foi promovido a cliente. Informe CPF/CNPJ
                para emitir propostas e apólices.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      {contact.notes ? (
        <Card>
          <CardHeader>
            <CardTitle>Anotações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm">{contact.notes}</p>
          </CardContent>
        </Card>
      ) : null}
      <PromoteContactDialog
        open={promoteOpen}
        onOpenChange={setPromoteOpen}
        contactId={contact.id}
        defaultLegalName={contact.name}
      />
      <ConfirmDeleteDialog
        entityLabel="contato"
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleConfirmDelete}
        isPending={deleteMutation.isPending}
      />
    </div>
  )
}
