'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { ChannelType } from '@repo/shared'
import { CHANNEL_META, CHANNEL_TYPES } from '@repo/shared'
import { AlertCircle, MessageCircle, RefreshCw, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

function isChannelType(value: string): value is ChannelType {
  return (CHANNEL_TYPES as readonly string[]).includes(value)
}

import type {
  ConversationData,
  ConversationFilters,
  ConversationStatus,
} from '../types'
import { ChannelIcon } from './channel-icon'
import { ConversationListItem } from './conversation-list-item'

interface ConversationListProps {
  readonly conversations: ConversationData[]
  readonly activeConversationId: string | null
  readonly isLoading: boolean
  readonly isError: boolean
  readonly filters: ConversationFilters
  readonly unreadCounts: Record<string, number>
  readonly onSelectConversation: (id: string) => void
  readonly onFiltersChange: (filters: ConversationFilters) => void
  readonly onRetry: () => void
}

type FilterTab = 'ALL' | ConversationStatus

const FILTER_TABS: ReadonlyArray<{ value: FilterTab; label: string }> = [
  { value: 'ALL', label: 'Ativas' },
  { value: 'WAITING_HUMAN', label: 'Fila' },
  { value: 'HUMAN_ACTIVE', label: 'Meus' },
  { value: 'CLOSED', label: 'Fechadas' },
]

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
  )
}

function ConversationListError({ onRetry }: { readonly onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <AlertCircle className="text-destructive h-10 w-10" />
      <p className="text-muted-foreground text-sm">
        Erro ao carregar conversas
      </p>
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5">
        <RefreshCw className="h-3.5 w-3.5" />
        Tentar novamente
      </Button>
    </div>
  )
}

function ConversationListEmpty() {
  return (
    <div className="text-muted-foreground flex flex-col items-center justify-center py-12">
      <MessageCircle className="mb-2 h-12 w-12 opacity-50" />
      <p className="text-sm">Nenhuma conversa encontrada</p>
    </div>
  )
}

export function ConversationList({
  conversations,
  activeConversationId,
  isLoading,
  isError,
  filters,
  unreadCounts,
  onSelectConversation,
  onFiltersChange,
  onRetry,
}: ConversationListProps) {
  const [searchInput, setSearchInput] = useState(filters.search ?? '')
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [])
  const activeTab: FilterTab = filters.status ?? 'ALL'
  const handleTabChange = (tab: FilterTab) => {
    onFiltersChange({
      ...filters,
      status: tab === 'ALL' ? undefined : tab,
    })
  }
  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      onFiltersChange({
        ...filters,
        search: value.length > 0 ? value : undefined,
      })
    }, 300)
  }
  const handleChannelTypeChange = (value: string | null) => {
    const selected = value ?? 'ALL'
    onFiltersChange({
      ...filters,
      channelType:
        selected !== 'ALL' && isChannelType(selected) ? selected : undefined,
    })
  }
  const filteredConversations = filters.channelType
    ? conversations.filter((c) => c.channelType === filters.channelType)
    : conversations
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
    return bTime - aTime
  })
  return (
    <div className="bg-sidebar flex h-full flex-col">
      {/* Header */}
      <div className="border-sidebar-border flex min-h-[57px] items-center justify-between border-b px-4 py-3">
        <h1 className="text-sidebar-foreground text-lg font-semibold">
          Conversas
        </h1>
        <MessageCircle className="text-primary h-5 w-5" />
      </div>
      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Buscar conversa..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="bg-muted/50 focus-visible:ring-primary border-0 pl-9 focus-visible:ring-1"
          />
        </div>
      </div>
      {/* Filter Tabs */}
      <div className="flex justify-between gap-1 px-3 pb-2">
        {FILTER_TABS.map((tab) => (
          <Button
            key={tab.value}
            onClick={() => handleTabChange(tab.value)}
            variant={activeTab === tab.value ? 'default' : 'outline'}
            className={cn(
              'max-w-full rounded-md text-xs font-medium transition-colors',
              activeTab === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            {tab.label}
          </Button>
        ))}
      </div>
      {/* Channel Filter */}
      <div className="px-3 pb-2">
        <Select
          value={filters.channelType ?? 'ALL'}
          onValueChange={handleChannelTypeChange}
        >
          <SelectTrigger className="bg-muted/50 h-8 border-0 text-xs">
            <SelectValue placeholder="Filtrar por canal">
              {(value: string | null) => {
                if (!value || value === 'ALL') return 'Todos os canais'
                if (isChannelType(value)) return CHANNEL_META[value].label
                return null
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos os canais</SelectItem>
            {(
              Object.entries(CHANNEL_META) as Array<
                [ChannelType, { label: string; color: string }]
              >
            ).map(([type, meta]) => (
              <SelectItem key={type} value={type}>
                <span className="flex items-center gap-2">
                  <ChannelIcon channelType={type} size={14} />
                  {meta.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {/* Conversation List */}
      <div className="chat-scrollbar flex-1 overflow-y-auto">
        {isLoading && <ConversationListSkeleton />}
        {isError && !isLoading && <ConversationListError onRetry={onRetry} />}
        {!isLoading && !isError && sortedConversations.length === 0 && (
          <ConversationListEmpty />
        )}
        {!isLoading &&
          !isError &&
          sortedConversations.map((conversation) => (
            <ConversationListItem
              key={conversation.id}
              conversation={conversation}
              isActive={conversation.id === activeConversationId}
              unreadCount={unreadCounts[conversation.id] ?? 0}
              onSelect={() => onSelectConversation(conversation.id)}
            />
          ))}
      </div>
    </div>
  )
}
