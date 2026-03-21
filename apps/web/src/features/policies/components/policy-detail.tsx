'use client';

import { useState } from 'react';
import { Ban } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

import { useCancelPolicy, usePolicy } from '../hooks/use-policies';
import { POLICY_BRANCH_LABELS, POLICY_STATUS_BADGE_VARIANT, POLICY_STATUS_LABELS } from '../types';

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

const formatDate = (dateStr: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(
    new Date(dateStr),
  );

interface PolicyDetailProps {
  policyId: string;
}

export function PolicyDetail({ policyId }: PolicyDetailProps) {
  const { data, isLoading, isError } = usePolicy(policyId);
  const cancelMutation = useCancelPolicy();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  function handleCancelConfirm() {
    if (!cancelReason.trim()) return;
    cancelMutation.mutate(
      { id: policyId, reason: cancelReason.trim() },
      {
        onSuccess: () => {
          setShowCancelDialog(false);
          setCancelReason('');
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError || !data?.data) {
    return <p className="text-destructive text-sm">Erro ao carregar apólice. Tente novamente.</p>;
  }

  const policy = data.data;

  return (
    <>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Apólice {policy.policyNumber}</h1>
          <div className="flex items-center gap-2">
            <Badge variant={POLICY_STATUS_BADGE_VARIANT[policy.status]}>
              {POLICY_STATUS_LABELS[policy.status]}
            </Badge>
            <Badge variant="outline">{POLICY_BRANCH_LABELS[policy.branch]}</Badge>
          </div>
        </div>
        {policy.status === 'ACTIVE' && (
          <Button variant="destructive" size="sm" onClick={() => setShowCancelDialog(true)}>
            <Ban className="mr-2 size-4" />
            Cancelar apólice
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações gerais</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoItem label="Cliente" value={policy.clientId} />
            <InfoItem label="Proposta" value={policy.proposalId} />
            <InfoItem label="Vendedor" value={policy.salespersonId} />
            <InfoItem label="Prêmio" value={formatCurrency(policy.premiumValueInCents)} />
            <InfoItem
              label="Vigência"
              value={`${formatDate(policy.startDate)} → ${formatDate(policy.endDate)}`}
            />
            <InfoItem label="Criado em" value={formatDate(policy.createdAt)} />
          </dl>
        </CardContent>
      </Card>

      {policy.status === 'CANCELLED' && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Cancelamento</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoItem
                label="Cancelado em"
                value={policy.cancelledAt ? formatDate(policy.cancelledAt) : '—'}
              />
              <InfoItem label="Motivo" value={policy.cancelReason ?? '—'} />
            </dl>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={showCancelDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowCancelDialog(false);
            setCancelReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar apólice</DialogTitle>
            <DialogDescription>
              Informe o motivo do cancelamento da apólice {policy.policyNumber}.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Motivo do cancelamento..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelDialog(false);
                setCancelReason('');
              }}
            >
              Voltar
            </Button>
            <Button
              variant="destructive"
              disabled={!cancelReason.trim() || cancelMutation.isPending}
              onClick={handleCancelConfirm}
            >
              {cancelMutation.isPending ? 'Cancelando...' : 'Confirmar cancelamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value}</dd>
    </div>
  );
}
