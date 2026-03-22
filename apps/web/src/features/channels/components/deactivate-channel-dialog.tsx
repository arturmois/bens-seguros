'use client';

import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import type { ChannelData } from '../types';
import { useDeactivateChannel } from '../hooks/use-channels';

interface DeactivateChannelDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly channel: ChannelData | null;
}

export function DeactivateChannelDialog({
  open,
  onOpenChange,
  channel,
}: DeactivateChannelDialogProps) {
  const deactivateChannel = useDeactivateChannel();

  function handleDeactivate() {
    if (!channel) return;

    deactivateChannel.mutate(channel.id, {
      onSuccess: () => onOpenChange(false),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Desativar Canal</DialogTitle>
          <DialogDescription>
            Deseja desativar o canal {channel?.name}? Conversas em andamento serao encerradas.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeactivate}
            disabled={deactivateChannel.isPending}
          >
            {deactivateChannel.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Desativar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
