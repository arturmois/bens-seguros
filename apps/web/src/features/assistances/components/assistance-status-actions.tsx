'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import type { AssistanceStatus } from '../types';
import {
  ASSISTANCE_STATUS_COLORS,
  ASSISTANCE_STATUS_LABELS,
  VALID_ASSISTANCE_TRANSITIONS,
} from '../lib/constants';
import { useUpdateAssistanceStatus } from '../hooks/use-assistances';

interface AssistanceStatusActionsProps {
  readonly assistanceId: string;
  readonly currentStatus: AssistanceStatus;
}

export function AssistanceStatusActions({
  assistanceId,
  currentStatus,
}: AssistanceStatusActionsProps) {
  const [confirmingStatus, setConfirmingStatus] = useState<AssistanceStatus | null>(null);
  const updateStatus = useUpdateAssistanceStatus();

  const allowedTransitions = VALID_ASSISTANCE_TRANSITIONS[currentStatus];

  if (allowedTransitions.length === 0) return null;

  function handleConfirm() {
    if (!confirmingStatus) return;
    updateStatus.mutate(
      { id: assistanceId, status: confirmingStatus },
      { onSuccess: () => setConfirmingStatus(null) },
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Alterar Status</h3>
      <div className="flex flex-wrap gap-2">
        {allowedTransitions.map((targetStatus) => (
          <Button
            key={targetStatus}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setConfirmingStatus(targetStatus)}
            className={ASSISTANCE_STATUS_COLORS[targetStatus]}
          >
            {ASSISTANCE_STATUS_LABELS[targetStatus]}
          </Button>
        ))}
      </div>

      <AlertDialog
        open={confirmingStatus !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmingStatus(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alteracao de status</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja alterar o status da assistencia para{' '}
              <strong>{confirmingStatus ? ASSISTANCE_STATUS_LABELS[confirmingStatus] : ''}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose
              render={
                <Button variant="outline" disabled={updateStatus.isPending}>
                  Cancelar
                </Button>
              }
            />
            <Button onClick={handleConfirm} disabled={updateStatus.isPending}>
              {updateStatus.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
