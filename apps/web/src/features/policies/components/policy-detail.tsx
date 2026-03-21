'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Ban, RefreshCw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

import { useCancelPolicy, usePolicy } from '../hooks/use-policies';
import { POLICY_BRANCH_LABELS, POLICY_STATUS_BADGE_VARIANT, POLICY_STATUS_LABELS } from '../types';
import { PolicyCancellationCard, PolicyInfoCard } from './policy-info-cards';
import { PolicyTabs } from './policy-tabs';

interface PolicyDetailProps {
  policyId: string;
}

export function PolicyDetail({ policyId }: PolicyDetailProps) {
  const router = useRouter();
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
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <p className="text-destructive text-sm">Erro ao carregar apolice.</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/policies')}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="mr-1 h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const policy = data.data;

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/policies')}
          className="gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Apolices
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">{policy.policyNumber}</span>
      </nav>

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Apolice {policy.policyNumber}</h1>
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
            Cancelar apolice
          </Button>
        )}
      </div>

      <PolicyInfoCard
        clientId={policy.clientId}
        proposalId={policy.proposalId}
        salespersonId={policy.salespersonId}
        premiumValueInCents={policy.premiumValueInCents}
        startDate={policy.startDate}
        endDate={policy.endDate}
        createdAt={policy.createdAt}
      />

      {policy.status === 'CANCELLED' && (
        <PolicyCancellationCard
          cancelledAt={policy.cancelledAt}
          cancelReason={policy.cancelReason}
        />
      )}

      <Separator />

      <PolicyTabs policyId={policyId} />

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
            <DialogTitle>Cancelar apolice</DialogTitle>
            <DialogDescription>
              Informe o motivo do cancelamento da apolice {policy.policyNumber}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason-detail">Motivo do cancelamento</Label>
            <Textarea
              id="cancel-reason-detail"
              placeholder="Descreva o motivo..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
            />
          </div>
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
    </div>
  );
}
