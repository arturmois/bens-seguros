'use client';

import { cn } from '@/lib/utils';
import { Wifi, WifiOff } from 'lucide-react';

interface WhatsappStatusProps {
  readonly isConnected: boolean;
}

export function WhatsappStatus({ isConnected }: WhatsappStatusProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
        isConnected
          ? 'bg-[var(--chat-online)]/15 text-[var(--chat-online)]'
          : 'bg-destructive/10 text-destructive-foreground',
      )}
    >
      {isConnected ? (
        <>
          <Wifi className="h-3 w-3" />
          <span>Conectado</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          <span>Desconectado</span>
        </>
      )}
    </div>
  );
}
