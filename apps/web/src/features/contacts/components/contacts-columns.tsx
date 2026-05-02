'use client'

import type { ColumnDef } from '@tanstack/react-table'

import { CONTACT_SOURCE_LABELS } from '../lib/constants'
import type { ContactListItem } from '../lib/types'
import { ContactStageBadge } from './contact-stage-badge'

export function createContactsColumns(): ColumnDef<ContactListItem>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Nome',
      cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
      enableSorting: false,
    },
    {
      id: 'contact',
      header: 'Contato',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.phone ?? row.original.email ?? '—'}
        </span>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'source',
      header: 'Origem',
      cell: ({ row }) => CONTACT_SOURCE_LABELS[row.original.source],
      enableSorting: false,
    },
    {
      accessorKey: 'stage',
      header: 'Estágio',
      cell: ({ row }) => <ContactStageBadge stage={row.original.stage} />,
      enableSorting: false,
    },
  ]
}
