import type { ClaimPriority, ClaimStatus } from '../types';

interface SelectOption<TValue extends string> {
  readonly value: TValue;
  readonly label: string;
}

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  REGISTERED: 'Registrado',
  IN_ANALYSIS: 'Em Analise',
  AWAITING_DOCUMENT: 'Aguardando Documento',
  PENDING_INSPECTION: 'Pendente Vistoria',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  PAID: 'Pago',
  COMPLETED: 'Concluido',
};

export const CLAIM_PRIORITY_LABELS: Record<ClaimPriority, string> = {
  NORMAL: 'Normal',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

export const CLAIM_STATUS_COLORS: Record<ClaimStatus, string> = {
  REGISTERED: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  IN_ANALYSIS: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  AWAITING_DOCUMENT: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  PENDING_INSPECTION: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  COMPLETED: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
};

export const CLAIM_PRIORITY_COLORS: Record<ClaimPriority, string> = {
  NORMAL: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  URGENT: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

export const CLAIM_STATUS_OPTIONS: readonly SelectOption<ClaimStatus>[] = [
  { value: 'REGISTERED', label: 'Registrado' },
  { value: 'IN_ANALYSIS', label: 'Em Analise' },
  { value: 'AWAITING_DOCUMENT', label: 'Aguardando Documento' },
  { value: 'PENDING_INSPECTION', label: 'Pendente Vistoria' },
  { value: 'APPROVED', label: 'Aprovado' },
  { value: 'REJECTED', label: 'Rejeitado' },
  { value: 'PAID', label: 'Pago' },
  { value: 'COMPLETED', label: 'Concluido' },
] as const;

export const CLAIM_PRIORITY_OPTIONS: readonly SelectOption<ClaimPriority>[] = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' },
] as const;

export const VALID_CLAIM_TRANSITIONS: Record<ClaimStatus, readonly ClaimStatus[]> = {
  REGISTERED: ['IN_ANALYSIS'],
  IN_ANALYSIS: ['AWAITING_DOCUMENT', 'PENDING_INSPECTION', 'APPROVED', 'REJECTED'],
  AWAITING_DOCUMENT: ['IN_ANALYSIS'],
  PENDING_INSPECTION: ['APPROVED', 'REJECTED'],
  APPROVED: ['PAID'],
  REJECTED: [],
  PAID: ['COMPLETED'],
  COMPLETED: [],
} as const;

export function formatClaimNumber(claimNumber: number, createdAt: string | Date): string {
  const date = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const year = date.getFullYear();
  const padded = String(claimNumber).padStart(4, '0');
  return `SIN-${year}-${padded}`;
}
