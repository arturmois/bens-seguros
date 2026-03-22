'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, QrCode, Smartphone } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTab, TabsPanel } from '@/components/ui/tabs';
import { useSocket } from '@/features/chat/hooks/use-socket';
import { isRecord } from '@/features/chat/lib/type-guards';
import { chatApi } from '@/features/chat/lib/chat-api';

import type { ChannelData, ChannelStatusEvent, PairingCodeResultEvent } from '../types';

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

function isPairingCodeResultEvent(data: unknown): data is PairingCodeResultEvent {
  if (!isRecord(data)) return false;
  return typeof data['channelId'] === 'string' && typeof data['success'] === 'boolean';
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

  // Pairing code state
  const [phoneInput, setPhoneInput] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairingError, setPairingError] = useState<string | null>(null);

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
        setPairingCode(null);
        setPairingLoading(false);
        toast.success('Canal conectado com sucesso');

        autoCloseTimerRef.current = globalThis.setTimeout(() => {
          onOpenChange(false);
        }, AUTO_CLOSE_DELAY_MS);
      }
    },
    [channel, onOpenChange],
  );

  const handlePairingCodeResult = useCallback(
    (data: unknown) => {
      if (!isPairingCodeResultEvent(data)) return;
      if (!channel || data.channelId !== channel.id) return;

      setPairingLoading(false);

      if (data.success && data.code) {
        setPairingCode(data.code);
        setPairingError(null);
        return;
      }

      setPairingError(data.error ?? 'Erro ao gerar codigo de pareamento');
    },
    [channel],
  );

  useEffect(() => {
    if (!open || !socket || !channel) return;

    setQrData(null);
    setIsConnected(false);
    setPairingCode(null);
    setPairingLoading(false);
    setPairingError(null);
    clearAutoCloseTimer();

    // Subscribe to real-time status events
    socket.on(SOCKET_EVENTS.CHANNEL_STATUS, handleChannelStatus);
    socket.on(SOCKET_EVENTS.PAIRING_CODE_RESULT, handlePairingCodeResult);

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
      socket.off(SOCKET_EVENTS.PAIRING_CODE_RESULT, handlePairingCodeResult);
      clearAutoCloseTimer();
    };
  }, [open, socket, channel, handleChannelStatus, handlePairingCodeResult, clearAutoCloseTimer]);

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

  const handleRequestPairingCode = useCallback(() => {
    if (!channel || !phoneInput.trim()) return;

    setPairingLoading(true);
    setPairingError(null);
    setPairingCode(null);

    chatApi
      .post(`/chat/channels/${channel.id}/pair`, { phoneNumber: phoneInput.trim() })
      .catch(() => {
        setPairingLoading(false);
        setPairingError('Erro ao solicitar codigo de pareamento');
      });
  }, [channel, phoneInput]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar Canal</DialogTitle>
          <DialogDescription>Escolha como conectar seu WhatsApp a este canal.</DialogDescription>
        </DialogHeader>

        {isConnected ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <ConnectedState />
          </div>
        ) : (
          <Tabs defaultValue="qr">
            <TabsList className="w-full">
              <TabsTab value="qr">
                <QrCode className="size-4" />
                QR Code
              </TabsTab>
              <TabsTab value="pairing">
                <Smartphone className="size-4" />
                Codigo de Pareamento
              </TabsTab>
            </TabsList>

            <TabsPanel value="qr">
              <div className="flex flex-col items-center gap-4 py-6">
                {qrData && <QrCodeDisplay qrData={qrData} />}
                {!qrData && <WaitingState />}
              </div>
            </TabsPanel>

            <TabsPanel value="pairing">
              <div className="flex flex-col items-center gap-4 py-6">
                <PairingCodeTab
                  phoneInput={phoneInput}
                  onPhoneChange={setPhoneInput}
                  onRequest={handleRequestPairingCode}
                  loading={pairingLoading}
                  code={pairingCode}
                  error={pairingError}
                />
              </div>
            </TabsPanel>
          </Tabs>
        )}

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

interface PairingCodeTabProps {
  readonly phoneInput: string;
  readonly onPhoneChange: (value: string) => void;
  readonly onRequest: () => void;
  readonly loading: boolean;
  readonly code: string | null;
  readonly error: string | null;
}

function PairingCodeTab({
  phoneInput,
  onPhoneChange,
  onRequest,
  loading,
  code,
  error,
}: PairingCodeTabProps) {
  return (
    <div className="flex w-full flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        Ideal para ambientes sem camera. Digite o numero do WhatsApp e insira o codigo de 8 digitos
        no celular.
      </p>

      <div className="flex gap-2">
        <Input
          placeholder="+5511999998888"
          value={phoneInput}
          onChange={(e) => onPhoneChange(e.target.value)}
          disabled={loading}
          aria-label="Numero de telefone"
        />
        <Button onClick={onRequest} disabled={loading || phoneInput.trim().length < 10}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : 'Gerar'}
        </Button>
      </div>

      {code && <PairingCodeDisplay code={code} />}

      {error && (
        <p className="text-destructive text-center text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function PairingCodeDisplay({ code }: { readonly code: string }) {
  // Format as XXXX-XXXX for readability
  const formatted = code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;

  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border p-4">
      <p className="text-muted-foreground text-sm">Abra o WhatsApp no celular e va em:</p>
      <p className="text-muted-foreground text-xs">
        Configuracoes &gt; Aparelhos conectados &gt; Conectar com numero de telefone
      </p>
      <p
        className="font-mono text-3xl font-bold tracking-widest"
        aria-label={`Codigo de pareamento: ${formatted}`}
      >
        {formatted}
      </p>
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="text-warning size-4 animate-spin" />
        <span className="text-muted-foreground">Aguardando pareamento...</span>
      </div>
    </div>
  );
}
