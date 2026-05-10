'use client'

import { useMemo } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

import { useDebounce } from '@/hooks/use-debounce'
import { useListPolicies } from '@/api/endpoints/policies/policies'
import { ListPoliciesStatus } from '@/api/model/listPoliciesStatus'

interface RenewalPolicyInputProps {
  readonly value: string
  readonly onChange: (value: string) => void
}

export function RenewalPolicyInput({
  value,
  onChange,
}: RenewalPolicyInputProps) {
  const debouncedValue = useDebounce(value, 300)
  const enabled = debouncedValue.length >= 2
  const { data, isLoading } = useListPolicies(
    { search: debouncedValue, limit: 5, status: ListPoliciesStatus.ACTIVE },
    {
      query: {
        enabled,
        select: (r) => r.data.data,
      },
    }
  )
  const matchedClient = useMemo(() => {
    if (!enabled || isLoading) return null
    const match = data?.find(
      (p) => p.policyNumber.toLowerCase() === debouncedValue.toLowerCase()
    )
    return match?.clientName ?? null
  }, [data, debouncedValue, enabled, isLoading])
  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Input
          placeholder="Ex: 0000-0000-0000"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {isLoading && enabled && (
          <Loader2 className="text-muted-foreground absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin" />
        )}
      </div>
      {matchedClient && (
        <div className="flex items-center gap-1.5">
          <Badge
            variant="outline"
            className="border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400"
          >
            <CheckCircle2 className="mr-1 size-3" />
            Apólice vinculada
          </Badge>
          <span className="text-muted-foreground text-xs">{matchedClient}</span>
        </div>
      )}
    </div>
  )
}
