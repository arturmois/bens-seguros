'use client';

import { useState } from 'react';

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
import { Label } from '@/components/ui/label';

import { useMarkProposalLost } from '../hooks/use-proposals';

interface LostReasonDialogProps {
  proposalId: string | null;
  onClose: () => void;
}

export function LostReasonDialog({ proposalId, onClose }: LostReasonDialogProps) {
  const [reason, setReason] = useState('');
  const markLostMutation = useMarkProposalLost();

  const handleSubmit = () => {
    if (!proposalId || !reason.trim()) return;

    markLostMutation.mutate(
      { id: proposalId, reason: reason.trim() },
      {
        onSuccess: () => {
          setReason('');
          onClose();
        },
      },
    );
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setReason('');
      onClose();
    }
  };

  return (
    <Dialog open={!!proposalId} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marcar como Perda</DialogTitle>
          <DialogDescription>Informe o motivo da perda desta proposta.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="lost-reason">Motivo</Label>
          <Input
            id="lost-reason"
            placeholder="Ex: Cliente optou pela concorrência"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!reason.trim() || markLostMutation.isPending}
          >
            {markLostMutation.isPending ? 'Salvando...' : 'Confirmar Perda'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
