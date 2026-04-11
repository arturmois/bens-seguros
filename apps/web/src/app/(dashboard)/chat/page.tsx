import type { Metadata } from 'next'

import { ChatLayoutContent } from '@/features/chat/components/chat-layout-content'

export const metadata: Metadata = { title: 'Chat' }

export default function ChatPage() {
  return <ChatLayoutContent />
}
