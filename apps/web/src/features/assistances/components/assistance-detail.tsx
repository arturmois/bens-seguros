'use client';

import { ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTab } from '@/components/ui/tabs';

import { DocumentList } from '@/features/documents/components/document-list';
import { DocumentUpload } from '@/features/documents/components/document-upload';
import { formatDate } from '@/lib/formatters';

import type { AssistanceData } from '../types';
import { ASSISTANCE_TYPE_LABELS } from '../lib/constants';
import { useAssistance } from '../hooks/use-assistances';
import { AssistanceStatusActions } from './assistance-status-actions';
import { AssistanceStatusBadge } from './assistance-status-badge';

interface AssistanceDetailProps {
  readonly assistanceId: string;
}

export function AssistanceDetail({ assistanceId }: AssistanceDetailProps) {
  const router = useRouter();
  const { data, isLoading, isError } = useAssistance(assistanceId);

  if (isLoading) return <DetailSkeleton />;

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <p className="text-destructive text-sm">Erro ao carregar assistencia.</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/assistances')}>
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

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/assistances')}
          className="gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Assistencias
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">{ASSISTANCE_TYPE_LABELS[data.type]}</span>
      </nav>

      <DetailHeader assistance={data} />
      <Separator />
      <DetailInfoGrid assistance={data} />
      <Separator />
      <AssistanceStatusActions assistanceId={assistanceId} currentStatus={data.status} />
      <Separator />

      <Tabs defaultValue="documents">
        <TabsList>
          <TabsTab value="documents">Documentos</TabsTab>
        </TabsList>
        <TabsContent value="documents" className="mt-4 space-y-4">
          <DocumentUpload entityType="ASSISTANCE" entityId={assistanceId} />
          <DocumentList entityType="ASSISTANCE" entityId={assistanceId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DetailHeader({ assistance }: { readonly assistance: AssistanceData }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <h2 className="text-xl font-semibold">{ASSISTANCE_TYPE_LABELS[assistance.type]}</h2>
      <AssistanceStatusBadge status={assistance.status} />
      <span className="text-muted-foreground text-sm">
        {assistance.clientName ?? assistance.clientId}
      </span>
      <span className="text-muted-foreground text-sm">
        {assistance.policyNumber ?? assistance.policyId}
      </span>
    </div>
  );
}

function DetailInfoGrid({ assistance }: { readonly assistance: AssistanceData }) {
  const mapsUrl =
    assistance.latitude && assistance.longitude
      ? `https://www.google.com/maps?q=${String(assistance.latitude)},${String(assistance.longitude)}`
      : null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <InfoItem label="Endereco">
        {assistance.address ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{assistance.address}</span>
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary inline-flex items-center gap-1 text-xs hover:underline"
              >
                Abrir no Google Maps
                <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        ) : (
          <span className="text-sm font-medium">-</span>
        )}
      </InfoItem>
      <InfoItem label="Prestador" value={assistance.providerName ?? '-'} />
      <InfoItem label="Telefone Prestador" value={assistance.providerPhone ?? '-'} />
      <InfoItem label="Solicitado em" value={formatDate(assistance.requestedAt)} />
      <InfoItem
        label="Agendado para"
        value={assistance.scheduledAt ? formatDate(assistance.scheduledAt) : '-'}
      />
      <InfoItem
        label="Concluido em"
        value={assistance.completedAt ? formatDate(assistance.completedAt) : '-'}
      />
    </div>
  );
}

function InfoItem({
  label,
  value,
  children,
}: {
  readonly label: string;
  readonly value?: string;
  readonly children?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      {children ?? <p className="text-sm font-medium">{value}</p>}
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
      </div>
      <Skeleton className="h-px w-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={`detail-skel-${String(i)}`} className="space-y-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}
