'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Paperclip, Send, Smile } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { ContactData, ConversationData, MessageData } from '../types';
import { ChatHeader } from './chat-header';
import { MessageBubble } from './message-bubble';

interface ChatAreaProps {
  readonly conversation: ConversationData | null;
  readonly contact: ContactData | null;
  readonly messages: MessageData[];
  readonly currentUserId: string;
  readonly typingUser: string | null;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly onSendMessage: (text: string) => void;
  readonly onEmitTyping: () => void;
  readonly onBack: () => void;
  readonly onOpenProfile: () => void;
  readonly onAssign: () => void;
  readonly onTransfer: () => void;
  readonly onReturnToQueue: () => void;
  readonly onCloseConversation: () => void;
}

function MessagesLoading() {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className={i % 2 === 0 ? 'flex justify-start' : 'flex justify-end'}>
          <Skeleton className={`h-12 rounded-2xl ${i % 2 === 0 ? 'w-2/3' : 'w-1/2'}`} />
        </div>
      ))}
    </div>
  );
}

function MessagesError() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2">
      <AlertCircle className="text-destructive h-10 w-10" />
      <p className="text-muted-foreground text-sm">Erro ao carregar mensagens</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-chat-bg flex h-full flex-col items-center justify-center">
      <div className="text-center">
        <div className="bg-primary/10 mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full">
          <Send className="text-primary h-10 w-10" />
        </div>
        <h2 className="text-foreground mb-2 text-xl font-semibold">Selecione uma conversa</h2>
        <p className="text-muted-foreground max-w-sm">
          Escolha uma conversa na lista ao lado para comecar a trocar mensagens
        </p>
      </div>
    </div>
  );
}

function MessageInput({
  onSendMessage,
  onEmitTyping,
  disabled,
}: {
  readonly onSendMessage: (text: string) => void;
  readonly onEmitTyping: () => void;
  readonly disabled: boolean;
}) {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    onEmitTyping();
  };

  return (
    <div className="border-border bg-card border-t p-2 md:p-3">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground hidden h-9 w-9 flex-shrink-0 md:flex"
          disabled={disabled}
        >
          <Smile className="h-5 w-5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground hidden h-9 w-9 flex-shrink-0 md:flex"
          disabled={disabled}
        >
          <Paperclip className="h-5 w-5" />
        </Button>
        <Input
          value={inputValue}
          onChange={handleChange}
          placeholder="Digite uma mensagem..."
          className="bg-muted/50 focus-visible:ring-primary flex-1 border-0 focus-visible:ring-1"
          disabled={disabled}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!inputValue.trim() || disabled}
          className="bg-primary hover:bg-primary/90 h-9 w-9 flex-shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

export function ChatArea({
  conversation,
  contact,
  messages,
  currentUserId,
  typingUser,
  isLoading,
  isError,
  onSendMessage,
  onEmitTyping,
  onBack,
  onOpenProfile,
  onAssign,
  onTransfer,
  onReturnToQueue,
  onCloseConversation,
}: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (!conversation) {
    return <EmptyState />;
  }

  const canSendMessage =
    conversation.status === 'HUMAN_ACTIVE' && conversation.assignedTo === currentUserId;

  return (
    <div className="bg-chat-bg flex h-full flex-col">
      <ChatHeader
        conversation={conversation}
        contact={contact}
        currentUserId={currentUserId}
        typingUser={typingUser}
        onBack={onBack}
        onOpenProfile={onOpenProfile}
        onAssign={onAssign}
        onTransfer={onTransfer}
        onReturnToQueue={onReturnToQueue}
        onClose={onCloseConversation}
      />

      {/* Messages */}
      <div className="chat-scrollbar flex-1 overflow-y-auto p-3 md:p-4">
        {isLoading && <MessagesLoading />}
        {isError && !isLoading && <MessagesError />}
        {!isLoading && !isError && (
          <div className="space-y-3">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isFromCurrentUser={message.senderId === currentUserId}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <MessageInput
        onSendMessage={onSendMessage}
        onEmitTyping={onEmitTyping}
        disabled={!canSendMessage}
      />
    </div>
  );
}
