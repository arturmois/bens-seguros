'use client'

import { createContext, useContext } from 'react'
import type { UseMutationResult } from '@tanstack/react-query'
import type { AgentPresence, ConversationData } from '../types'

interface ChatActions {
  readonly assignConversation: UseMutationResult<
    ConversationData,
    Error,
    string
  >
  readonly transferConversation: UseMutationResult<
    ConversationData,
    Error,
    { id: string; toUserId: string; toUserName: string }
  >
  readonly returnToQueue: UseMutationResult<ConversationData, Error, string>
  readonly returnToBot: UseMutationResult<ConversationData, Error, string>
  readonly closeConversation: UseMutationResult<ConversationData, Error, string>
  readonly onlineAgents: ReadonlyArray<AgentPresence>
}

const ChatActionsContext = createContext<ChatActions | null>(null)

export function ChatActionsProvider({
  children,
  value,
}: {
  readonly children: React.ReactNode
  readonly value: ChatActions
}) {
  return (
    <ChatActionsContext.Provider value={value}>
      {children}
    </ChatActionsContext.Provider>
  )
}

export function useChatActions(): ChatActions {
  const context = useContext(ChatActionsContext)
  if (!context) {
    throw new Error('useChatActions must be used within ChatActionsProvider')
  }
  return context
}
