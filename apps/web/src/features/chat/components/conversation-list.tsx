'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertCircle, MessageCircle, RefreshCw, Search } from 'lucide-react';

import type { ConversationData, ConversationFilters, ConversationStatus } from '../types';
import { ConversationStatusBadge } from './conversation-status-badge';

interface ConversationListProps {
  readonly conversations: ConversationData[];
  readonly activeConversationId: string | null;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly filters: ConversationFilters;
  readonly onSelectConversation: (id: string) => void;
  readonly onFiltersChange: (filters: ConversationFilters) => void;
  readonly onRetry: () => void;
}

type FilterTab = 'ALL' | ConversationStatus;

const FILTER_TABS: ReadonlyArray<{ value: FilterTab; label: string }> = [
  { value: 'ALL', label: 'Todos' },
  { value: 'WAITING_HUMAN', label: 'Fila' },
  { value: 'HUMAN_ACTIVE', label: 'Meus' },
  { value: 'CLOSED', label: 'Fechados' },
];

function getDisplayName(conversation: ConversationData): string {
  return conversation.whatsappPhone ?? 'Contato';
}

function ConversationListSkeleton() {
  return (
    <div className="space-y-1 p-3">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3">
          <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ConversationListError({ onRetry }: { readonly onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <AlertCircle className="text-destructive h-10 w-10" />
      <p className="text-muted-foreground text-sm">Erro ao carregar conversas</p>
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5">
        <RefreshCw className="h-3.5 w-3.5" />
        Tentar novamente
      </Button>
    </div>
  );
}

function ConversationListEmpty() {
  return (
    <div className="text-muted-foreground flex flex-col items-center justify-center py-12">
      <MessageCircle className="mb-2 h-12 w-12 opacity-50" />
      <p className="text-sm">Nenhuma conversa encontrada</p>
    </div>
  );
}

function ConversationItem({
  conversation,
  isActive,
  onSelect,
}: {
  readonly conversation: ConversationData;
  readonly isActive: boolean;
  readonly onSelect: () => void;
}) {
  const displayName = getDisplayName(conversation);
  const isWaiting = conversation.status === 'WAITING_HUMAN';

  return (
    <button
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 px-3 py-3 text-left transition-colors',
        'hover:bg-sidebar-hover',
        isActive && 'bg-sidebar-accent',
        isWaiting && 'border-l-4 border-[var(--chat-waiting)]',
      )}
    >
      <div className="relative shrink-0">
        <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full">
          <span className="text-primary text-base font-semibold">
            {displayName.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-foreground truncate font-medium">{displayName}</span>
            <ConversationStatusBadge status={conversation.status} />
          </div>
          {conversation.lastMessageAt && (
            <span className="text-muted-foreground shrink-0 text-xs">
              {formatDistanceToNow(new Date(conversation.lastMessageAt), {
                addSuffix: false,
                locale: ptBR,
              })}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className="text-muted-foreground truncate text-sm">
            {conversation.lastMessageText ?? 'Sem mensagens'}
          </p>
          {conversation.status === 'HUMAN_ACTIVE' && conversation.assignedToName && (
            <span className="text-muted-foreground shrink-0 text-xs">
              {conversation.assignedToName}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export function ConversationList({
  conversations,
  activeConversationId,
  isLoading,
  isError,
  filters,
  onSelectConversation,
  onFiltersChange,
  onRetry,
}: ConversationListProps) {
  const activeTab: FilterTab = filters.status ?? 'ALL';

  const handleTabChange = (tab: FilterTab) => {
    onFiltersChange({
      ...filters,
      status: tab === 'ALL' ? undefined : tab,
    });
  };

  const handleSearchChange = (value: string) => {
    onFiltersChange({
      ...filters,
      search: value.length > 0 ? value : undefined,
    });
  };

  const sortedConversations = [...conversations].sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bTime - aTime;
  });

  return (
    <div className="bg-sidebar flex h-full flex-col">
      {/* Header */}
      <div className="border-sidebar-border flex items-center justify-between border-b px-4 py-4">
        <h1 className="text-sidebar-foreground text-xl font-semibold">Conversas</h1>
        <MessageCircle className="text-primary h-5 w-5" />
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Buscar conversa..."
            value={filters.search ?? ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="bg-muted/50 focus-visible:ring-primary border-0 pl-9 focus-visible:ring-1"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 px-3 pb-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleTabChange(tab.value)}
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              activeTab === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conversation List */}
      <div className="chat-scrollbar flex-1 overflow-y-auto">
        {isLoading && <ConversationListSkeleton />}
        {isError && !isLoading && <ConversationListError onRetry={onRetry} />}
        {!isLoading && !isError && sortedConversations.length === 0 && <ConversationListEmpty />}
        {!isLoading &&
          !isError &&
          sortedConversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isActive={conversation.id === activeConversationId}
              onSelect={() => onSelectConversation(conversation.id)}
            />
          ))}
      </div>
    </div>
  );
}
