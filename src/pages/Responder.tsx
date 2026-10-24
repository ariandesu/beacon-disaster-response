import { useState, useCallback, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import IncidentMap from '../components/IncidentMap'
import IncidentCard from '../components/IncidentCard'
import StatusFilter from '../components/StatusFilter'
import LoginModal from '../components/LoginModal'
import { useAuth } from '../hooks/useAuth'
import { useBeacons } from '../hooks/useBeacons'
import { useClaim } from '../hooks/useClaim'
import { Button, Alert, AlertDescription, cn } from '../components/ui'
import type { BeaconStatus } from '../types/database'

export default function Responder() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, isAuthenticated, isLoading: authLoading, logout, refresh } = useAuth()
  const { beacons, isLoading: beaconsLoading, error: beaconsError, refetch } = useBeacons()
  const { myClaims, fetchMyClaims } = useClaim(user?.$id ?? null)

  const [statusFilter, setStatusFilter] = useState<BeaconStatus | 'all'>('all')
  const [selectedBeaconId, setSelectedBeaconId] = useState<string | null>(null)
  const [showLogin, setShowLogin] = useState(false)
  const [mobileView, setMobileView] = useState<'map' | 'list'>('map')

  // Deep link: /respond?beacon=BCN-...
  useEffect(() => {
    const beaconId = searchParams.get('beacon')
    if (beaconId) {
      const beacon = beacons.find(b => b.beaconId === beaconId)
      if (beacon) {
        setSelectedBeaconId(beaconId)
        setMobileView('list')
        setSearchParams({}, { replace: true })
      }
    }
  }, [beacons, searchParams, setSearchParams])

  useEffect(() => {
    if (isAuthenticated) fetchMyClaims()
  }, [isAuthenticated, fetchMyClaims])

  const filteredBeacons = useMemo(
    () => beacons.filter(b => statusFilter === 'all' || b.status === statusFilter),
    [beacons, statusFilter]
  )

  const counts = useMemo(
    () =>
      beacons.reduce(
        (acc, b) => {
          acc[b.status]++
          return acc
        },
        { open: 0, claimed: 0, resolved: 0 } as Record<BeaconStatus, number>
      ),
    [beacons]
  )

  const handleClaimSuccess = useCallback(() => {
    refetch()
    fetchMyClaims()
  }, [refetch, fetchMyClaims])

  const handleResolveSuccess = useCallback(() => {
    refetch()
    fetchMyClaims()
  }, [refetch, fetchMyClaims])

  const handleLoginSuccess = useCallback(() => {
    refresh()
    fetchMyClaims()
  }, [refresh, fetchMyClaims])

  if (authLoading || beaconsLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-beacon-red border-t-transparent" aria-label="Loading" />
          <p className="text-sm text-gray-500">Loading incidents…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Incident Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Live view of all active beacons. Claim an incident to respond.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <div className="hidden text-right sm:block">
                <p className="text-xs uppercase tracking-wide text-gray-500">Responder</p>
                <p className="max-w-[180px] truncate text-sm font-medium text-gray-900">
                  {user?.name || user?.email || user?.$id}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 ring-1 ring-gray-200">
                <span className="text-sm font-bold text-gray-700">
                  {(user?.name?.[0] || user?.email?.[0] || '?').toUpperCase()}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={logout}>
                Log out
              </Button>
            </>
          ) : (
            <Button onClick={() => setShowLogin(true)}>Sign In to Respond</Button>
          )}
        </div>
      </div>

      {beaconsError && (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>Failed to load incidents: {beaconsError}</span>
            <Button variant="outline" size="sm" onClick={refetch}>Retry</Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusFilter activeFilter={statusFilter} onChange={setStatusFilter} counts={counts} />

        {/* Mobile map/list toggle */}
        <div className="flex rounded-lg border border-gray-200 bg-white p-1 lg:hidden" role="tablist" aria-label="View mode">
          {(['map', 'list'] as const).map(view => (
            <button
              key={view}
              role="tab"
              aria-selected={mobileView === view}
              onClick={() => setMobileView(view)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors',
                mobileView === view ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              {view}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Map */}
        <div className={cn('lg:col-span-3', mobileView === 'map' ? 'block' : 'hidden lg:block')}>
          <div className="h-[420px] overflow-hidden rounded-xl border border-gray-200 bg-white p-1 shadow-sm lg:h-[620px]">
            <IncidentMap
              beacons={filteredBeacons}
              selectedBeaconId={selectedBeaconId}
              onBeaconClick={beacon => setSelectedBeaconId(beacon.beaconId)}
            />
          </div>
        </div>

        {/* Incident list */}
        <div className={cn('lg:col-span-2', mobileView === 'list' ? 'block' : 'hidden lg:block')}>
          <div className="flex h-[620px] flex-col rounded-xl border border-gray-200 bg-gray-50/50">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
                Incidents
              </h2>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-gray-600 ring-1 ring-gray-200">
                {filteredBeacons.length}
              </span>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-3">
              {filteredBeacons.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                  <svg className="mb-3 h-10 w-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <p className="text-sm font-medium text-gray-600">No incidents found</p>
                  <p className="mt-1 text-xs text-gray-400">Adjust filters or wait for new beacons</p>
                </div>
              ) : (
                filteredBeacons.map(beacon => (
                  <IncidentCard
                    key={beacon.beaconId}
                    beacon={beacon}
                    userId={user?.$id ?? null}
                    isAuthenticated={isAuthenticated}
                    selectedBeaconId={selectedBeaconId}
                    onSelect={setSelectedBeaconId}
                    onClaimSuccess={handleClaimSuccess}
                    onResolveSuccess={handleResolveSuccess}
                    onRequestLogin={() => setShowLogin(true)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* My claims */}
      {isAuthenticated && myClaims.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-700">
            My Active Claims
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {myClaims.map(claim => {
              const beacon = beacons.find(b => b.beaconId === claim.beaconId)
              return (
                <div key={claim.$id} className="rounded-lg border border-gray-200 bg-white p-4">
                  <p className="font-mono text-sm font-bold text-beacon-red">{claim.beaconId}</p>
                  <p className="mt-1 truncate text-sm text-gray-600">
                    {beacon?.locationLabel || 'Unknown location'}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Claimed {new Date(claim.claimedAt).toLocaleString()}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  )
}