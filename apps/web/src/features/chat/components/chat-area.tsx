import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Conversation, Message, User } from '@/types/chat';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowLeft,
  Check,
  CheckCheck,
  MoreVertical,
  Paperclip,
  Phone,
  Send,
  Smile,
  Video,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface ChatAreaProps {
  conversation: Conversation | null;
  messages: Message[];
  currentUserId: string;
  onSendMessage: (content: string) => void;
  onBack: () => void;
  onOpenProfile: () => void;
  getOtherParticipant: (conversation: Conversation) => User;
}

export function ChatArea({
  conversation,
  messages,
  currentUserId,
  onSendMessage,
  onBack,
  onOpenProfile,
  getOtherParticipant,
}: ChatAreaProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  if (!conversation) {
    return (
      <div className="bg-chat-bg flex h-full flex-col items-center justify-center">
        <div className="text-center">
          <div className="bg-primary/10 mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full">
            <Send className="text-primary h-10 w-10" />
          </div>
          <h2 className="text-foreground mb-2 text-xl font-semibold">Selecione uma conversa</h2>
          <p className="text-muted-foreground max-w-sm">
            Escolha uma conversa na lista ao lado para começar a trocar mensagens
          </p>
        </div>
      </div>
    );
  }

  const otherUser = getOtherParticipant(conversation);

  return (
    <div className="bg-chat-bg flex h-full flex-col">
      {/* Header */}
      <div className="border-border bg-card flex items-center justify-between border-b px-3 py-2 md:px-4 md:py-3">
        <div className="flex items-center gap-2 md:gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <button
            onClick={onOpenProfile}
            className="flex items-center gap-2 transition-opacity hover:opacity-80 md:gap-3"
          >
            <div className="relative">
              <img
                src={otherUser.avatar}
                alt={otherUser.name}
                className="bg-muted h-9 w-9 rounded-full md:h-10 md:w-10"
              />
              {otherUser.status === 'online' && (
                <span className="bg-chat-online border-card absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2" />
              )}
            </div>
            <div className="text-left">
              <h2 className="text-foreground text-sm font-semibold md:text-base">
                {otherUser.name}
              </h2>
              <p className="text-muted-foreground text-xs">
                {otherUser.status === 'online' ? 'Online' : 'Offline'}
              </p>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground h-8 w-8 md:h-9 md:w-9"
          >
            <Phone className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground h-8 w-8 md:h-9 md:w-9"
          >
            <Video className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground h-8 w-8 md:h-9 md:w-9"
            onClick={onOpenProfile}
          >
            <MoreVertical className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="chat-scrollbar flex-1 overflow-y-auto p-3 md:p-4">
        <div className="space-y-3">
          {messages.map((message) => {
            const isSent = message.senderId === currentUserId;

            return (
              <div
                key={message.id}
                className={cn('animate-message-in flex', isSent ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3 py-2 shadow-sm md:max-w-[70%] md:px-4 md:py-2.5',
                    isSent
                      ? 'bg-chat-bubble-sent text-chat-bubble-sent-foreground rounded-br-md'
                      : 'bg-chat-bubble-received text-chat-bubble-received-foreground rounded-bl-md',
                  )}
                >
                  <p className="break-words text-sm md:text-base">{message.content}</p>
                  <div
                    className={cn(
                      'mt-1 flex items-center justify-end gap-1',
                      isSent ? 'text-chat-bubble-sent-foreground/70' : 'text-chat-timestamp',
                    )}
                  >
                    <span className="text-[10px] md:text-xs">
                      {format(message.timestamp, 'HH:mm', { locale: ptBR })}
                    </span>
                    {isSent && (
                      <span className="ml-0.5">
                        {message.status === 'read' ? (
                          <CheckCheck className="h-3.5 w-3.5 text-blue-300" />
                        ) : message.status === 'delivered' ? (
                          <CheckCheck className="h-3.5 w-3.5" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-border bg-card border-t p-2 md:p-3">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground hidden h-9 w-9 flex-shrink-0 md:flex"
          >
            <Smile className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground hidden h-9 w-9 flex-shrink-0 md:flex"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Digite uma mensagem..."
            className="bg-muted/50 focus-visible:ring-primary flex-1 border-0 focus-visible:ring-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!inputValue.trim()}
            className="bg-primary hover:bg-primary/90 h-9 w-9 flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
