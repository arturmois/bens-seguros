'use client'

import { AlertCircle, ChevronLeft, ChevronRight, FileText } from 'lucide-react'

import type { ListBillingInvoices200DataItem } from '@/api/model'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCursorPagination } from '@/hooks/use-cursor-pagination'
import { formatCurrency, formatDate } from '@/lib/formatters'

import { useBillingInvoices } from '../hooks/use-billing-invoices'
import { INVOICE_STATUS_LABEL, INVOICE_STATUS_VARIANT } from '../lib/constants'

type Invoice = ListBillingInvoices200DataItem

function InvoicesSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-12 w-full rounded-lg" />
      <Skeleton className="h-12 w-full rounded-lg" />
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
  )
}

function InvoicesError({ onRetry }: { readonly onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <AlertCircle className="text-destructive size-8" />
      <p className="text-muted-foreground text-sm">Erro ao carregar faturas.</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  )
}

function InvoicesEmpty() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <FileText className="text-muted-foreground size-8" />
      <p className="text-muted-foreground text-sm">
        Nenhuma fatura ainda. Suas faturas aparecerão aqui quando emitidas.
      </p>
    </div>
  )
}

function InvoiceRow({ invoice }: { readonly invoice: Invoice }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Badge variant={INVOICE_STATUS_VARIANT[invoice.status]} size="sm">
          {INVOICE_STATUS_LABEL[invoice.status]}
        </Badge>
        <span className="text-foreground text-sm">
          {formatDate(invoice.periodStart)} — {formatDate(invoice.periodEnd)}
        </span>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span
          className="text-foreground tabular-nums"
          data-slot="invoice-amount"
        >
          {formatCurrency(invoice.amountCents)}
        </span>
        <span className="text-muted-foreground">
          Venc. {formatDate(invoice.dueDate)}
        </span>
        {invoice.invoiceUrl !== null && (
          <Button
            size="sm"
            variant="outline"
            render={
              <a href={invoice.invoiceUrl} target="_blank" rel="noreferrer">
                Abrir
              </a>
            }
          />
        )}
      </div>
    </div>
  )
}

export function InvoicesList() {
  const pagination = useCursorPagination(10)
  const { data, isLoading, isError, refetch } = useBillingInvoices({
    cursor: pagination.currentCursor,
    limit: pagination.pageSize,
  })

  if (isLoading) return <InvoicesSkeleton />
  if (isError) return <InvoicesError onRetry={() => refetch()} />

  const items = data?.items ?? []
  const nextCursor = data?.nextCursor ?? null
  const hasNext = nextCursor !== null

  if (items.length === 0 && !pagination.hasPreviousPage) {
    return <InvoicesEmpty />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Faturas</CardTitle>
        <CardDescription>Histórico de cobranças da assinatura.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          {items.map((invoice) => (
            <InvoiceRow key={invoice.id} invoice={invoice} />
          ))}
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={pagination.goToPrevious}
            disabled={!pagination.hasPreviousPage}
            aria-label="Página anterior"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => nextCursor && pagination.goToNext(nextCursor)}
            disabled={!hasNext}
            aria-label="Próxima página"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
