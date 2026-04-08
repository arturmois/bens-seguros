import { cn } from '@/lib/utils'
import { TYPE_FILTER_OPTIONS } from '../lib/constants'

interface ClientsFilterTabsProps {
  readonly activeFilter: string
  readonly onFilterChange: (value: string) => void
}

export function ClientsFilterTabs({
  activeFilter,
  onFilterChange,
}: ClientsFilterTabsProps) {
  return (
    <div className="bg-muted flex w-fit items-center gap-1 rounded-lg p-0.5">
      {TYPE_FILTER_OPTIONS.map((filter) => (
        <button
          key={filter.value}
          type="button"
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-all',
            activeFilter === filter.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => onFilterChange(filter.value)}
        >
          {filter.label}
        </button>
      ))}
    </div>
  )
}
