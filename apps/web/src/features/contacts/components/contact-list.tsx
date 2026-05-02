'use client'

import Link from 'next/link'
import { useState } from 'react'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { useDebounce } from '@/hooks/use-debounce'

import { useContacts } from '../hooks/use-contacts'
import {
  CONTACT_SOURCE_LABELS,
  CONTACT_SOURCE_OPTIONS,
  CONTACT_STAGE_OPTIONS,
} from '../lib/constants'
import type { ContactSource, ContactStage } from '../lib/types'
import { ContactStageBadge } from './contact-stage-badge'

const ALL_VALUE = '__all__'
const STAGE_FILTER_OPTIONS = [
  { value: ALL_VALUE, label: 'Todos os estágios' },
  ...CONTACT_STAGE_OPTIONS,
] as const
const SOURCE_FILTER_OPTIONS = [
  { value: ALL_VALUE, label: 'Todas as origens' },
  ...CONTACT_SOURCE_OPTIONS,
] as const

export function ContactList() {
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<string>(ALL_VALUE)
  const [sourceFilter, setSourceFilter] = useState<string>(ALL_VALUE)

  const debouncedSearch = useDebounce(search, 300)

  const stage =
    stageFilter !== ALL_VALUE ? (stageFilter as ContactStage) : undefined
  const source =
    sourceFilter !== ALL_VALUE ? (sourceFilter as ContactSource) : undefined

  const { data, isLoading, isError, refetch } = useContacts({
    search: debouncedSearch || undefined,
    stage,
    source,
    limit: 20,
  })

  const contacts = data?.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por nome, telefone ou email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-72"
          aria-label="Buscar contatos"
        />

        <Select
          value={stageFilter}
          onValueChange={(value) => {
            if (value !== null) setStageFilter(value)
          }}
          items={STAGE_FILTER_OPTIONS}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Estágio">
              {(value: string | null) => {
                const item = STAGE_FILTER_OPTIONS.find(
                  (option) => option.value === value
                )
                return item?.label ?? null
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STAGE_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sourceFilter}
          onValueChange={(value) => {
            if (value !== null) setSourceFilter(value)
          }}
          items={SOURCE_FILTER_OPTIONS}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Origem">
              {(value: string | null) => {
                const item = SOURCE_FILTER_OPTIONS.find(
                  (option) => option.value === value
                )
                return item?.label ?? null
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SOURCE_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <ContactListSkeleton />
      ) : isError ? (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed p-6">
          <p role="alert" className="text-destructive text-sm">
            Erro ao carregar contatos.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="text-primary text-sm hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      ) : contacts.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground text-sm">
            Nenhum contato encontrado.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Estágio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell>
                    <Link
                      href={`/contacts/${contact.id}`}
                      className="font-medium hover:underline"
                    >
                      {contact.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {contact.phone ?? contact.email ?? '—'}
                  </TableCell>
                  <TableCell>{CONTACT_SOURCE_LABELS[contact.source]}</TableCell>
                  <TableCell>
                    <ContactStageBadge stage={contact.stage} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

function ContactListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  )
}
