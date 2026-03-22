'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { SOCKET_EVENTS } from '@repo/shared';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSocket } from '@/features/chat/hooks/use-socket';
import { isRecord } from '@/features/chat/lib/type-guards';
import { chatApi } from '@/features/chat/lib/chat-api';

import type { ChannelData, ChannelStatusEvent } from '../types';

interface ChannelQrDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly channel: ChannelData | null;
}

const AUTO_CLOSE_DELAY_MS = 3_000;

function isChannelStatusEvent(data: unknown): data is ChannelStatusEvent {
  if (!isRecord(data)) return false;
  return (
    typeof data['channelId'] === 'string' &&
    typeof data['status'] === 'string' &&
    ['CONNECTED', 'DISCONNECTED', 'QR_PENDING'].includes(data['status'])
  );
}

interface ChannelStateAckData {
  readonly state: string;
  readonly qr: string | null;
}

interface ChannelStateAck {
  readonly ok: boolean;
  readonly data?: ChannelStateAckData;
}

function isChannelStateAck(data: unknown): data is ChannelStateAck {
  if (!isRecord(data)) return false;
  if (typeof data['ok'] !== 'boolean') return false;
  if (data['ok'] && isRecord(data['data'])) {
    const inner = data['data'];
    return typeof inner['state'] === 'string';
  }
  return true;
}

export function ChannelQrDialog({ open, onOpenChange, channel }: ChannelQrDialogProps) {
  const { socket } = useSocket();
  const [qrData, setQrData] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAutoCloseTimer = useCallback(() => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
  }, []);

  const handleChannelStatus = useCallback(
    (data: unknown) => {
      if (!isChannelStatusEvent(data)) return;
      if (!channel || data.channelId !== channel.id) return;

      if (data.status === 'QR_PENDING' && data.qr) {
        setQrData(data.qr);
        setIsConnected(false);
        return;
      }

      if (data.status === 'CONNECTED') {
        setIsConnected(true);
        setQrData(null);
        toast.success('Canal conectado com sucesso');

        autoCloseTimerRef.current = setTimeout(() => {
          onOpenChange(false);
        }, AUTO_CLOSE_DELAY_MS);
      }
    },
    [channel, onOpenChange],
  );

  useEffect(() => {
    if (!open || !socket || !channel) return;

    setQrData(null);
    setIsConnected(false);
    clearAutoCloseTimer();

    // Subscribe to real-time status events
    socket.on(SOCKET_EVENTS.CHANNEL_STATUS, handleChannelStatus);

    // Request current state via ack (handles QR generated before dialog opened)
    socket.emit(
      SOCKET_EVENTS.CHANNEL_STATUS_GET,
      { channelId: channel.id },
      (response: unknown) => {
        if (!isChannelStateAck(response)) return;
        if (!response.ok || !response.data) return;

        const { state, qr } = response.data;

        if (state === 'qr_pending' && qr) {
          setQrData(qr);
          setIsConnected(false);
          return;
        }

        if (state === 'connected') {
          setIsConnected(true);
          setQrData(null);
        }
      },
    );

    return () => {
      socket.off(SOCKET_EVENTS.CHANNEL_STATUS, handleChannelStatus);
      clearAutoCloseTimer();
    };
  }, [open, socket, channel, handleChannelStatus, clearAutoCloseTimer]);

  useEffect(() => {
    if (!open || !channel) return;

    chatApi.post(`/chat/channels/${channel.id}/connect`, {}).catch(() => {
      toast.error('Erro ao iniciar conexao do canal');
    });
  }, [open, channel]);

  useEffect(() => {
    if (!open) {
      clearAutoCloseTimer();
    }
  }, [open, clearAutoCloseTimer]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar Canal</DialogTitle>
          <DialogDescription>
            Escaneie o QR Code abaixo com o WhatsApp no celular.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-6">
          {isConnected && <ConnectedState />}
          {!isConnected && qrData && <QrCodeDisplay qrData={qrData} />}
          {!isConnected && !qrData && <WaitingState />}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function QrCodeDisplay({ qrData }: { readonly qrData: string }) {
  return (
    <>
      <div className="bg-background rounded-lg border p-4">
        <QRCodeSVG value={qrData} size={256} />
      </div>
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="text-warning size-4 animate-spin" />
        <span className="text-muted-foreground">Aguardando scan...</span>
      </div>
    </>
  );
}

function WaitingState() {
  return (
    <>
      <div className="bg-muted flex size-64 items-center justify-center rounded-lg border">
        <QrCode className="text-muted-foreground size-16" />
      </div>
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="text-muted-foreground size-4 animate-spin" />
        <span className="text-muted-foreground">Gerando QR Code...</span>
      </div>
    </>
  );
}

function ConnectedState() {
  return (
    <>
      <div className="bg-success/10 flex size-64 items-center justify-center rounded-lg border">
        <CheckCircle2 className="text-success size-16" />
      </div>
      <span className="text-success text-sm font-medium">Conectado!</span>
    </>
  );
}
