import { cn } from '@/lib/utils';

import type { DocumentType } from '../types';
import { DOCUMENT_TYPE_LABELS } from '../lib/constants';

const DOCUMENT_TYPE_COLORS: Record<DocumentType, string> = {
  DRIVER_LICENSE: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  VEHICLE_REGISTRATION: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  POLICY_PDF: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  CLAIM_PHOTO: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  CLAIM_REPORT: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  PROOF_OF_PAYMENT: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  CONTRACT: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  OTHER: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

interface DocumentTypeBadgeProps {
  readonly type: DocumentType;
  readonly className?: string;
}

export function DocumentTypeBadge({ type, className }: DocumentTypeBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        DOCUMENT_TYPE_COLORS[type],
        className,
      )}
    >
      {DOCUMENT_TYPE_LABELS[type]}
    </span>
  );
}
