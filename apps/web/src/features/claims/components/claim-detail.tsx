'use client';

import { useState } from 'react';
import { ArrowLeft, Plus, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTab } from '@/components/ui/tabs';

import { useClaim } from '../hooks/use-claims';
import { formatClaimNumber } from '../lib/constants';
import { formatDate } from '@/lib/formatters';
import { ClaimPriorityBadge } from './claim-priority-badge';
import { DocumentList } from '@/features/documents/components/document-list';
import { DocumentUpload } from '@/features/documents/components/document-upload';
import { ClaimStatusActions } from './claim-status-actions';
import { ClaimStatusBadge } from './claim-status-badge';
import { OccurrenceForm } from './occurrence-form';
import { OccurrenceList } from './occurrence-list';

interface ClaimDetailProps {
  readonly claimId: string;
}

export function ClaimDetail({ claimId }: ClaimDetailProps) {
  const router = useRouter();
  const { data, isLoading, isError } = useClaim(claimId);
  const [occurrenceFormOpen, setOccurrenceFormOpen] = useState(false);

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <p className="text-destructive text-sm">Erro ao carregar sinistro.</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/claims')}>
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

  const claim = data;
  const formattedNumber = formatClaimNumber(claim.claimNumber, claim.createdAt);

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
        <Button variant="ghost" size="sm" onClick={() => router.push('/claims')} className="gap-1">
          <ArrowLeft className="h-4 w-4" />
          Sinistros
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">{formattedNumber}</span>
      </nav>

      <ClaimDetailHeader
        formattedNumber={formattedNumber}
        status={claim.status}
        priority={claim.priority}
      />

      <Separator />

      <ClaimInfoGrid claim={claim} />

      {claim.description && (
        <>
          <Separator />
          <div>
            <p className="text-muted-foreground text-xs">Descrição</p>
            <p className="mt-1 text-sm">{claim.description}</p>
          </div>
        </>
      )}

      <Separator />

      <ClaimStatusActions claimId={claimId} currentStatus={claim.status} />

      <Separator />

      <Tabs defaultValue="occurrences">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTab value="occurrences">Ocorrências</TabsTab>
            <TabsTab value="documents">Documentos</TabsTab>
          </TabsList>
          <Button size="sm" onClick={() => setOccurrenceFormOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Nova Ocorrência
          </Button>
        </div>

        <TabsContent value="occurrences" className="mt-4">
          <OccurrenceList claimId={claimId} />
        </TabsContent>

        <TabsContent value="documents" className="mt-4 space-y-4">
          <DocumentUpload entityType="CLAIM" entityId={claimId} />
          <DocumentList entityType="CLAIM" entityId={claimId} />
        </TabsContent>
      </Tabs>

      <OccurrenceForm
        claimId={claimId}
        open={occurrenceFormOpen}
        onOpenChange={setOccurrenceFormOpen}
      />
    </div>
  );
}

function ClaimDetailHeader({
  formattedNumber,
  status,
  priority,
}: {
  readonly formattedNumber: string;
  readonly status: import('../types').ClaimStatus;
  readonly priority: import('../types').ClaimPriority;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <h2 className="text-xl font-semibold">{formattedNumber}</h2>
      <ClaimStatusBadge status={status} />
      <ClaimPriorityBadge priority={priority} />
    </div>
  );
}

function ClaimInfoGrid({ claim }: { readonly claim: import('../types').ClaimData }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <InfoItem label="Cliente" value={claim.clientName ?? claim.clientId} />
      <InfoItem label="Apólice" value={claim.policyNumber ?? claim.policyId} />
      <InfoItem label="Seguradora" value={claim.insurerName ?? claim.insurerId ?? '-'} />
      <InfoItem label="Responsável" value={claim.assignedToName ?? claim.assignedToId ?? '-'} />
      <InfoItem label="Data de Registro" value={formatDate(claim.reportedAt)} />
      <InfoItem
        label="Data do Incidente"
        value={claim.incidentDate ? formatDate(claim.incidentDate) : '-'}
      />
      <InfoItem label="Local do Incidente" value={claim.incidentLocation ?? '-'} />
      <InfoItem
        label="Resolvido em"
        value={claim.resolvedAt ? formatDate(claim.resolvedAt) : '-'}
      />
      <InfoItem label="Encerrado em" value={claim.closedAt ? formatDate(claim.closedAt) : '-'} />
    </div>
  );
}

function InfoItem({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-16" />
      </div>
      <Skeleton className="h-px w-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={`detail-skel-${String(i)}`} className="space-y-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}
