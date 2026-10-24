import type { BeaconStatus } from '../types/database'
import { cn } from './ui'

interface StatusFilterProps {
  activeFilter: BeaconStatus | 'all'
  onChange: (_filter: BeaconStatus | 'all') => void
  counts: Record<BeaconStatus, number>
}

// Explicit class maps — Tailwind JIT cannot generate `bg-${color}-100`
const ACTIVE_STYLES: Record<'all' | BeaconStatus, string> = {
  all: 'bg-slate-900 text-white',
  open: 'bg-red-600 text-white',
  claimed: 'bg-amber-500 text-white',
  resolved: 'bg-green-600 text-white',
}

const DOT_STYLES: Record<'all' | BeaconStatus, string> = {
  all: 'bg-slate-400',
  open: 'bg-red-500',
  claimed: 'bg-amber-500',
  resolved: 'bg-green-500',
}

const FILTERS: { value: BeaconStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'claimed', label: 'Claimed' },
  { value: 'resolved', label: 'Resolved' },
]

export default function StatusFilter({ activeFilter, onChange, counts }: StatusFilterProps) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Incident status filters">
      {FILTERS.map(filter => {
        const count = filter.value === 'all'
          ? counts.open + counts.claimed + counts.resolved
          : counts[filter.value]
        const isActive = activeFilter === filter.value

        return (
          <button
            key={filter.value}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(filter.value)}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-beacon-red focus-visible:ring-offset-2',
              isActive
                ? `${ACTIVE_STYLES[filter.value]} border-transparent shadow-sm`
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            <span className={cn('h-2 w-2 rounded-full', DOT_STYLES[filter.value])} aria-hidden="true" />
            {filter.label}
            <span
              className={cn(
                'ml-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
                isActive ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-600'
              )}
            >
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}