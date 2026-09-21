'use client'

import { Plus, UserCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { RelatedEntityTableSkeleton } from '@/components/shared/related-entity-table-skeleton'
import { useOrgs } from '@/features/org/hooks/use-orgs'
import { formatDate } from '@/lib/formatters'
import { hasPermission } from '@/lib/permissions'
import { useClientContacts } from '../hooks/use-client-contacts'

interface ClientContactsTabProps {
  readonly clientId: string
}

const COLS = 5

const SOURCE_LABELS: Record<string, string> = {
  MANUAL: 'Manual',
  CHAT_WHATSAPP: 'WhatsApp',
  CHAT_WIDGET: 'Widget',
  FORM_WEB: 'Formulário',
  IMPORT: 'Importação',
  REFERRAL: 'Indicação',
}

export function ClientContactsTab({ clientId }: ClientContactsTabProps) {
  const router = useRouter()
  const { activeOrg } = useOrgs()
  const { data, isLoading, isError, refetch } = useClientContacts(clientId)
  const canCreate = hasPermission(
    activeOrg?.role ?? 'VIEWER',
    'contacts:create'
  )
  if (isLoading) return <RelatedEntityTableSkeleton cols={COLS} />
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8">
        <p className="text-destructive text-sm">Erro ao carregar contatos.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  }
  const items = data?.data ?? []
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <UserCircle className="size-10 text-muted-foreground/50" />
        <p className="text-muted-foreground text-sm">
          Nenhum contato vinculado
        </p>
        {canCreate && (
          <Button
            size="sm"
            render={<Link href={`/contacts?clientId=${clientId}`} />}
          >
            <Plus className="mr-1 h-4 w-4" />
            Vincular contato
          </Button>
        )}
      </div>
    )
  }
  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Origem</TableHead>
            <TableHead>Adicionado em</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((c) => (
            <TableRow
              key={c.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => router.push(`/contacts/${c.id}`)}
            >
              <TableCell className="font-medium">{c.name}</TableCell>
              <TableCell>{c.phone ?? '-'}</TableCell>
              <TableCell>{c.email ?? '-'}</TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {SOURCE_LABELS[c.source] ?? c.source}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatDate(c.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex justify-end pt-1">
        <Button
          variant="link"
          size="sm"
          render={<Link href={`/contacts?clientId=${clientId}`} />}
        >
          Ver todos os contatos →
        </Button>
      </div>
    </div>
  )
}
