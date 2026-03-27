'use client'

import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AlertCircle, Check, CheckCheck, FileText } from 'lucide-react'
import Image from 'next/image'

import type { MessageData, SenderType } from '../types'

interface MessageBubbleProps {
  readonly message: MessageData
  readonly isFromCurrentUser: boolean
}

function MessageStatusIcon({
  status,
}: {
  readonly status: MessageData['status']
}) {
  if (status === 'FAILED') {
    return <AlertCircle className="h-3.5 w-3.5 text-red-400" />
  }
  if (status === 'READ') {
    return <CheckCheck className="h-3.5 w-3.5 text-blue-300" />
  }
  if (status === 'DELIVERED') {
    return <CheckCheck className="h-3.5 w-3.5" />
  }
  return <Check className="h-3.5 w-3.5" />
}

function MediaContent({ message }: { readonly message: MessageData }) {
  if (!message.mediaUrl) return null

  if (message.type === 'IMAGE') {
    return (
      <div className="mb-1 overflow-hidden rounded-lg">
        <Image
          src={message.mediaUrl}
          alt={message.text ?? 'Imagem'}
          width={300}
          height={200}
          className="max-h-[300px] w-auto object-contain"
        />
      </div>
    )
  }

  if (message.type === 'AUDIO') {
    return (
      <audio controls className="mb-1 max-w-full" preload="metadata">
        <source src={message.mediaUrl} />
      </audio>
    )
  }

  if (message.type === 'VIDEO') {
    return (
      <video
        controls
        className="mb-1 max-h-[300px] max-w-full rounded-lg"
        preload="metadata"
      >
        <source src={message.mediaUrl} />
      </video>
    )
  }

  if (message.type === 'DOCUMENT') {
    return (
      <a
        href={message.mediaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-1 flex items-center gap-2 rounded-lg bg-black/5 px-3 py-2 text-sm hover:bg-black/10"
      >
        <FileText className="h-4 w-4 shrink-0" />
        <span className="truncate">Documento</span>
      </a>
    )
  }

  return (
    <p className="text-muted-foreground text-xs italic">Mídia não suportada</p>
  )
}

function isSystemMessage(senderType: SenderType): boolean {
  return senderType === 'SYSTEM'
}

export function MessageBubble({
  message,
  isFromCurrentUser,
}: MessageBubbleProps) {
  if (isSystemMessage(message.senderType)) {
    return (
      <div className="animate-message-in flex justify-center">
        <p className="text-muted-foreground max-w-[85%] text-center text-xs italic md:max-w-[60%]">
          {message.text}
        </p>
      </div>
    )
  }

  const isSent = isFromCurrentUser

  return (
    <div
      className={cn(
        'animate-message-in flex',
        isSent ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3 py-2 shadow-sm md:max-w-[70%] md:px-4 md:py-2.5',
          isSent
            ? 'bg-(--chat-bubble-sent) text-(--chat-bubble-sent-fg) rounded-br-md'
            : 'bg-(--chat-bubble-received) text-(--chat-bubble-received-fg) rounded-bl-md'
        )}
      >
        {!isSent && message.senderName && (
          <p className="text-primary mb-0.5 text-xs font-medium">
            {message.senderName}
          </p>
        )}
        <MediaContent message={message} />
        {message.text && (
          <p className="wrap-break-word text-sm md:text-base">{message.text}</p>
        )}
        <div
          className={cn(
            'mt-1 flex items-center justify-end gap-1',
            isSent
              ? 'text-(--chat-bubble-sent-fg)/70'
              : 'text-(--chat-timestamp)'
          )}
        >
          <span className="text-[10px] md:text-xs">
            {format(new Date(message.createdAt), 'HH:mm', { locale: ptBR })}
          </span>
          {isSent && (
            <span className="ml-0.5">
              <MessageStatusIcon status={message.status} />
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
