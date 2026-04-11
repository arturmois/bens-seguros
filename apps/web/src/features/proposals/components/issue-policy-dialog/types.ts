import { IssuePolicyBody } from '@/api/endpoints/policies/policies.zod'
import { z } from 'zod'

export const issuePolicyFormSchema = IssuePolicyBody.omit({
  proposalId: true,
  coverageDetails: true,
}).extend({
  insurerId: z.string().min(1, 'Selecione uma seguradora'),
})

export type IssuePolicyFormValues = z.infer<typeof issuePolicyFormSchema>

export const EMPTY_VALUES: IssuePolicyFormValues = {
  policyNumber: '',
  startDate: '',
  endDate: '',
  insurerId: '',
}

export function parseDateString(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date
}

export function formatDateToISO(date: Date | undefined): string {
  if (!date) return ''
  return date.toISOString()
}
