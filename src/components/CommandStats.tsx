import type { BeaconStatus } from '../types/database'

interface StatCardProps {
  label: string
  count: number
  status: BeaconStatus
  icon: React.ReactNode
}

function StatCard({ label, count, status, icon }: StatCardProps) {
  return (
    <div className={`p-6 rounded-xl border ${status === 'open' ? 'border-red-500/30 bg-red-900/20' : status === 'claimed' ? 'border-amber-500/30 bg-amber-900/20' : 'border-green-500/30 bg-green-900/20'}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-300 uppercase tracking-wide">{label}</p>
          <p className="text-4xl font-bold text-white mt-1">{count}</p>
        </div>
        <div className={`p-4 rounded-xl ${status === 'open' ? 'bg-red-500/20' : status === 'claimed' ? 'bg-amber-500/20' : 'bg-green-500/20'}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

interface CommandStatsProps {
  counts: Record<BeaconStatus, number>
}

export default function CommandStats({ counts }: CommandStatsProps) {
  const total = counts.open + counts.claimed + counts.resolved

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard
        label="Total Incidents"
        count={total}
        status="open"
        icon={<svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
      />
      <StatCard
        label="Open"
        count={counts.open}
        status="open"
        icon={<svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
      />
      <StatCard
        label="Claimed"
        count={counts.claimed}
        status="claimed"
        icon={<svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
      />
      <StatCard
        label="Resolved"
        count={counts.resolved}
        status="resolved"
        icon={<svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
      />
    </div>
  )
}