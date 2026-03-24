'use client'

import dynamic from 'next/dynamic'

import { Skeleton } from '@/components/ui/skeleton'

function ChatLayoutSkeleton() {
  return (
    <div className="bg-background flex h-full w-full overflow-hidden">
      {/* Conversation list skeleton */}
      <div className="hidden w-80 shrink-0 border-r md:block lg:w-96">
        <div className="space-y-3 p-4">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-14 w-full rounded-md" />
          <Skeleton className="h-14 w-full rounded-md" />
          <Skeleton className="h-14 w-full rounded-md" />
          <Skeleton className="h-14 w-full rounded-md" />
          <Skeleton className="h-14 w-full rounded-md" />
        </div>
      </div>
      {/* Chat area skeleton */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <Skeleton className="size-24 rounded-full" />
        <Skeleton className="mt-4 h-6 w-48" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>
    </div>
  )
}

const ChatLayout = dynamic(
  () =>
    import('@/features/chat/components/chat-layout').then((m) => m.ChatLayout),
  {
    loading: () => <ChatLayoutSkeleton />,
    ssr: false,
  }
)

export default function ChatPage() {
  return (
    <div className="-m-4 h-[calc(100vh-3.5rem)] sm:-m-6">
      <ChatLayout />
    </div>
  )
}
