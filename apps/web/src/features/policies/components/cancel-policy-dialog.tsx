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
import { Textarea } from '@/components/ui/textarea';

import { useCancelPolicy } from '../hooks/use-policies';
import type { PolicyData } from '../types';

interface CancelPolicyDialogProps {
  policy: PolicyData | null;
  onClose: () => void;
}

export function CancelPolicyDialog({ policy, onClose }: CancelPolicyDialogProps) {
  const [reason, setReason] = useState('');
  const cancelMutation = useCancelPolicy();

  function handleConfirm() {
    if (!policy || !reason.trim()) return;
    cancelMutation.mutate(
      { id: policy.id, reason: reason.trim() },
      {
        onSuccess: () => {
          onClose();
          setReason('');
        },
      },
    );
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      onClose();
      setReason('');
    }
  }

  return (
    <Dialog open={Boolean(policy)} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar apólice</DialogTitle>
          <DialogDescription>
            Informe o motivo do cancelamento da apólice {policy?.policyNumber}.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="Motivo do cancelamento..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
        />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onClose();
              setReason('');
            }}
          >
            Voltar
          </Button>
          <Button
            variant="destructive"
            disabled={!reason.trim() || cancelMutation.isPending}
            onClick={handleConfirm}
          >
            {cancelMutation.isPending ? 'Cancelando...' : 'Confirmar cancelamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
