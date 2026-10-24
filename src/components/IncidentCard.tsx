import { useState } from 'react'
import type { Beacon } from '../types/database'
import {
  STATUS_BADGE_CLASSES,
  STATUS_LABELS,
  SEVERITY_BADGE_CLASSES,
  SEVERITY_LABELS,
  CATEGORY_LABELS,
} from '../types/database'
import { useClaim } from '../hooks/useClaim'
import { Button, Badge, Card, CardContent, Alert, AlertDescription, cn } from './ui'

interface IncidentCardProps {
  beacon: Beacon
  userId: string | null
  isAuthenticated: boolean
  selectedBeaconId: string | null
  onSelect: (_beaconId: string) => void
  onClaimSuccess: () => void
  onResolveSuccess: () => void
  onRequestLogin: () => void
}

export default function IncidentCard({
  beacon,
  userId,
  isAuthenticated,
  selectedBeaconId,
  onSelect,
  onClaimSuccess,
  onResolveSuccess,
  onRequestLogin,
}: IncidentCardProps) {
  const { claimBeacon, resolveBeacon, isLoading: claimLoading } = useClaim(userId)
  const [error, setError] = useState<string | null>(null)

  const isSelected = selectedBeaconId === beacon.beaconId
  const isAssigned = beacon.responderId === userId
  const canClaim = beacon.status === 'open'
  const canResolve = isAssigned && beacon.status === 'claimed'

  const handleClaim = async () => {
    setError(null)
    const result = await claimBeacon(beacon.beaconId)
    if (result.success) onClaimSuccess()
    else setError(result.error ?? 'Claim failed')
  }

  const handleResolve = async () => {
    setError(null)
    const result = await resolveBeacon(beacon.beaconId)
    if (result.success) onResolveSuccess()
    else setError(result.error ?? 'Resolve failed')
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all',
        isSelected ? 'border-beacon-red ring-2 ring-beacon-red/20' : 'hover:border-gray-300'
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(beacon.beaconId)}
        aria-pressed={isSelected}
        className="w-full p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-beacon-red focus-visible:ring-inset"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-bold text-gray-900">{beacon.beaconId}</span>
              <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide', STATUS_BADGE_CLASSES[beacon.status])}>
                {STATUS_LABELS[beacon.status]}
              </span>
            </div>

            <p className="mb-2 truncate text-sm text-gray-700">{beacon.locationLabel}</p>

            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <Badge variant="secondary" className="font-normal">{CATEGORY_LABELS[beacon.category]}</Badge>
              <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-medium', SEVERITY_BADGE_CLASSES[beacon.severity])}>
                {SEVERITY_LABELS[beacon.severity]}
              </span>
              <span>·</span>
              <span>{formatDate(beacon.createdAt)}</span>
            </div>

            {beacon.responderId && (
              <p className="mt-2 truncate text-xs text-gray-600">
                Assigned to <span className="font-mono font-medium">{beacon.responderId.slice(0, 12)}…</span>
              </p>
            )}
          </div>

          <span
            className={cn(
              'mt-1 h-3 w-3 flex-shrink-0 rounded-full',
              beacon.status === 'open' && 'bg-red-500',
              beacon.status === 'claimed' && 'bg-amber-500',
              beacon.status === 'resolved' && 'bg-green-500'
            )}
            aria-hidden="true"
          />
        </div>
      </button>

      {isSelected && (
        <CardContent className="space-y-3 border-t border-gray-100 pt-4">
          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          {!isAuthenticated ? (
            <Button className="w-full" onClick={onRequestLogin}>
              Sign in to claim
            </Button>
          ) : canClaim ? (
            <Button className="w-full" onClick={handleClaim} disabled={claimLoading}>
              {claimLoading ? 'Claiming…' : 'Claim Incident'}
            </Button>
          ) : canResolve ? (
            <Button variant="success" className="w-full" onClick={handleResolve} disabled={claimLoading}>
              {claimLoading ? 'Resolving…' : 'Resolve Incident'}
            </Button>
          ) : beacon.status === 'resolved' ? (
            <p className="rounded-lg bg-green-50 py-2 text-center text-sm font-medium text-green-700">
              Incident resolved
            </p>
          ) : (
            <p className="rounded-lg bg-gray-50 py-2 text-center text-sm text-gray-500">
              Assigned to another responder
            </p>
          )}
        </CardContent>
      )}
    </Card>
  )
}