import { useState, useCallback, useEffect, useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useBeacons } from '../hooks/useBeacons'
import { useSupplies } from '../hooks/useSupplies'
import IncidentMap from '../components/IncidentMap'
import EventTimeline from '../components/EventTimeline'
import SupplyInventory from '../components/SupplyInventory'
import ResetModal from '../components/ResetModal'
import LoginModal from '../components/LoginModal'
import type { Beacon, BeaconStatus } from '../types/database'

const STATUS_CONFIG: Record<BeaconStatus, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  open: {
    label: 'Open',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
  },
  claimed: {
    label: 'Claimed',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  },
  resolved: {
    label: 'Resolved',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
  },
}

const SEVERITY_ORDER: Record<Beacon['severity'], number> = { critical: 0, high: 1, medium: 2, low: 3 }

export default function Command() {
  const { user, isAuthenticated, isLoading: authLoading, refresh } = useAuth()
  const { beacons, isLoading: beaconsLoading, error: beaconsError, refetch: refetchBeacons } = useBeacons()
  const { refetch: refetchSupplies } = useSupplies()

  const [selectedBeaconId, setSelectedBeaconId] = useState<string | null>(null)
  const [showReset, setShowReset] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Check if user is admin
  useEffect(() => {
    if (user) {
      const adminEmails = ['admin@beacon.local', 'command@beacon.local']
      setIsAdmin(adminEmails.includes(user.email?.toLowerCase() ?? ''))
    } else {
      setIsAdmin(false)
    }
  }, [user])

  const counts = useMemo(() => beacons.reduce(
    (acc, b) => { acc[b.status]++; return acc },
    { open: 0, claimed: 0, resolved: 0 } as Record<BeaconStatus, number>
  ), [beacons])

  const sortedBeacons = useMemo(() =>
    [...beacons].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
  , [beacons])

  const handleResetComplete = useCallback(() => {
    setShowReset(false)
    refetchBeacons()
    refetchSupplies()
    refresh()
  }, [refetchBeacons, refetchSupplies, refresh])

  const handleLoginSuccess = useCallback(() => {
    refresh()
  }, [refresh])

  if (authLoading || beaconsLoading) {
    return (
      <div className="min-h-screen bg-beacon-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-beacon-red border-t-transparent" aria-label="Loading" />
          <p className="text-gray-400 text-sm">Loading command center...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-beacon-dark text-white font-mono">
      {/* Header */}
      <header className="border-b border-gray-800 sticky top-0 z-40 bg-beacon-dark/95 backdrop-blur-sm">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Left: Logo + Title */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <svg className="w-10 h-10 text-beacon-red" viewBox="0 0 100 100" fill="none" aria-hidden="true">
                    <circle cx="50" cy="50" r="48" fill="currentColor"/>
                    <path d="M50 20 L50 55 M35 40 L50 55 L65 40" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="50" cy="70" r="6" fill="white"/>
                  </svg>
                  {/* Live indicator */}
                  <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-beacon-dark animate-pulse" aria-label="Live" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight">BEACON COMMAND</h1>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Incident Operations Center</p>
                </div>
              </div>

              {/* System status badges */}
              <div className="hidden md:flex items-center gap-2 ml-6 border-l border-gray-800 pl-6">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-900/50 rounded-full border border-gray-700">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-xs text-gray-300 font-medium">LIVE</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-900/50 rounded-full border border-gray-700">
                  <span className="text-xs text-gray-400">{counts.open + counts.claimed + counts.resolved}</span>
                  <span className="text-xs text-gray-500">TOTAL</span>
                </div>
              </div>
            </div>

            {/* Right: User + Admin */}
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  <div className="hidden lg:block text-right">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">OPERATOR</p>
                    <p className="text-sm font-medium text-white truncate max-w-xs">{user?.name || user?.email || user?.$id}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700">
                    <span className="text-lg font-bold text-beacon-red">{user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}</span>
                  </div>
                  {isAdmin && (
                    <span className="px-2 py-1 text-xs font-bold bg-red-500/20 text-red-400 rounded border border-red-500/30 uppercase tracking-wider">ADMIN</span>
                  )}
                </div>
              ) : (
                              <button
                                onClick={() => setShowLogin(true)}
                                className="px-4 py-2 bg-beacon-red text-white font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-beacon-red focus:ring-offset-2 focus:ring-offset-beacon-dark transition-all text-sm"
                              >
                                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                SIGN IN
                              </button>
                            )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Alert banner */}
        {beaconsError && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500/30 rounded-xl flex items-center gap-3" role="alert">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <div className="flex-1">
              <p className="text-red-300 font-medium">Data Load Error</p>
              <p className="text-xs text-red-500">{beaconsError}</p>
            </div>
            <button onClick={refetchBeacons} className="px-3 py-1.5 text-xs font-medium bg-red-500/20 text-red-300 rounded border border-red-500/30 hover:bg-red-500/30 transition-colors">
              RETRY
            </button>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="TOTAL INCIDENTS"
            value={counts.open + counts.claimed + counts.resolved}
            trend={null}
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            variant="primary"
          />
          <StatCard
            label="OPEN"
            value={counts.open}
            trend={counts.open > 0 ? 'active' : 'idle'}
            icon={STATUS_CONFIG.open.icon}
            variant="danger"
          />
          <StatCard
            label="CLAIMED"
            value={counts.claimed}
            trend={counts.claimed > 0 ? 'active' : 'idle'}
            icon={STATUS_CONFIG.claimed.icon}
            variant="warning"
          />
          <StatCard
            label="RESOLVED"
            value={counts.resolved}
            trend={counts.resolved > 0 ? 'active' : 'idle'}
            icon={STATUS_CONFIG.resolved.icon}
            variant="success"
          />
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left: Map + Timeline */}
          <div className="lg:col-span-8 space-y-6">
            {/* Map Panel */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                <h2 className="font-semibold text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  INCIDENT MAP
                </h2>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-400 rounded" /> {counts.open} Open</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-400 rounded" /> {counts.claimed} Claimed</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-400 rounded" /> {counts.resolved} Resolved</span>
                </div>
              </div>
              <div className="h-[500px] sm:h-[600px] p-2">
                <IncidentMap
                  beacons={beacons}
                  selectedBeaconId={selectedBeaconId}
                  onBeaconClick={beacon => setSelectedBeaconId(beacon.beaconId)}
                />
              </div>
            </div>

            {/* Timeline Panel */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                <h2 className="font-semibold text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                  EVENT TIMELINE
                </h2>
                {selectedBeaconId && (
                  <span className="px-2 py-1 text-xs font-mono bg-gray-800 text-gray-400 rounded border border-gray-700">
                    {selectedBeaconId}
                  </span>
                )}
              </div>
              <div className="p-4 h-[350px] overflow-y-auto">
                <EventTimeline beaconId={selectedBeaconId || undefined} limit={100} />
              </div>
            </div>
          </div>

          {/* Right Sidebar: Incidents List + Supplies + Admin */}
          <div className="lg:col-span-4 space-y-6">
            {/* Incidents List */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden flex flex-col h-[850px]">
              <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                <h2 className="font-semibold text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                  ACTIVE INCIDENTS
                </h2>
                <span className="px-2 py-1 text-xs font-mono bg-gray-800 text-gray-400 rounded border border-gray-700">
                  {sortedBeacons.length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {sortedBeacons.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 py-12">
                    <svg className="w-12 h-12 mb-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    <p className="text-sm">No incidents reported</p>
                    <p className="text-xs text-gray-600">Awaiting beacon activation...</p>
                  </div>
                ) : (
                  sortedBeacons.map((beacon) => (
                    <IncidentListItem
                      key={beacon.beaconId}
                      beacon={beacon}
                      isSelected={selectedBeaconId === beacon.beaconId}
                      onClick={() => setSelectedBeaconId(beacon.beaconId)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Supplies + Admin */}
            <div className="space-y-4">
              <SupplyInventory isAdmin={isAdmin} />

              {isAdmin && (
                <div className="bg-gray-900/50 border border-red-500/30 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-red-500/30 flex items-center gap-3">
                    <div className="p-2 bg-red-500/20 rounded-lg">
                      <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">ADMIN ACTIONS</h3>
                      <p className="text-xs text-gray-500">Dangerous operations</p>
                    </div>
                  </div>
                  <div className="p-4">
                    <button
                      onClick={() => setShowReset(true)}
                      className="w-full py-3 px-4 bg-red-600/20 text-red-400 font-medium rounded-lg border border-red-500/30 hover:bg-red-600/30 hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-beacon-dark transition-all text-sm"
                    >
                      <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      RESET DEMO DATA
                    </button>
                    <p className="text-xs text-gray-500 text-center mt-2">Clears all incidents, claims, events. Restores default supplies.</p>
                  </div>
                </div>
              )}

              {!isAuthenticated && (
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 text-center">
                  <svg className="w-14 h-14 mx-auto mb-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  <h3 className="text-lg font-medium text-gray-300 mb-2">AUTHORIZATION REQUIRED</h3>
                  <p className="text-sm text-gray-500 mb-4">Sign in with admin credentials to access supply management and system reset.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-800 mt-auto">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-sm text-gray-500">
          <p>BEACON COMMAND &bull; INCIDENT OPERATIONS CENTER &bull; Beacon is a hackathon prototype and is not a substitute for official emergency services.</p>
        </div>
      </footer>

      <ResetModal
        isOpen={showReset}
        onClose={() => setShowReset(false)}
        isAdmin={isAdmin}
        onResetComplete={handleResetComplete}
      />
      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  )
}

// --- Sub-components ---

interface StatCardProps {
  label: string
  value: number
  trend: 'active' | 'idle' | null
  icon: React.ReactNode
  variant: 'primary' | 'danger' | 'warning' | 'success'
}

function StatCard({ label, value, trend, icon, variant }: StatCardProps) {
  const variantStyles = {
    primary: 'bg-blue-500/10 border-blue-500/30',
    danger: 'bg-red-500/10 border-red-500/30',
    warning: 'bg-amber-500/10 border-amber-500/30',
    success: 'bg-green-500/10 border-green-500/30',
  }
  const iconColors = {
    primary: 'text-blue-400',
    danger: 'text-red-400',
    warning: 'text-amber-400',
    success: 'text-green-400',
  }

  const variantIconBg = {
    primary: 'bg-blue-500/20',
    danger: 'bg-red-500/20',
    warning: 'bg-amber-500/20',
    success: 'bg-green-500/20',
  }

  return (
    <div className={`p-5 rounded-xl border ${variantStyles[variant]} bg-gray-900/30`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-3xl font-bold text-white tabular-nums">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${variantIconBg[variant]}`}>
          <span className={iconColors[variant]}>{icon}</span>
        </div>
      </div>
      {trend && (
        <div className="mt-3 pt-3 border-t border-gray-800 flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${trend === 'active' ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
          <span className={`text-xs font-medium ${trend === 'active' ? 'text-green-400' : 'text-gray-500'}`}>
            {trend === 'active' ? 'ACTIVE' : 'IDLE'}
          </span>
        </div>
      )}
    </div>
  )
}

function IncidentListItem({ beacon, isSelected, onClick }: { beacon: Beacon; isSelected: boolean; onClick: () => void }) {
  const config = STATUS_CONFIG[beacon.status]
  const severityColors: Record<Beacon['severity'], string> = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    medium: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  }

  const baseClasses = 'w-full p-4 rounded-xl border transition-all text-left'
  const selectedClasses = 'bg-gray-800/50 border-beacon-red/50 ring-1 ring-beacon-red/20'
  const unselectedClasses = 'bg-gray-900/30 border-gray-800 hover:bg-gray-800/50 hover:border-gray-700'

  return (
    <button
      onClick={onClick}
      className={baseClasses + ' ' + (isSelected ? selectedClasses : unselectedClasses)}
      aria-pressed={isSelected}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-bold text-white font-mono text-sm">{beacon.beaconId}</span>
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${config.bg} ${config.color} border ${config.border} uppercase tracking-wider`}>
              {config.label}
            </span>
            <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${severityColors[beacon.severity]} uppercase tracking-wider`}>
              {beacon.severity}
            </span>
          </div>
          <p className="text-sm text-gray-300 mb-2 truncate">{beacon.locationLabel}</p>
          <div className="flex items-center gap-3 text-[11px] text-gray-500">
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /></svg>
              {beacon.category}
            </span>
            {beacon.responderId && (
              <span className="flex items-center gap-1 text-gray-400">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                {beacon.responderId.slice(0, 12)}...
              </span>
            )}
          </div>
        </div>
        <div className="flex-shrink-0">
          <div className={'w-3 h-3 rounded-full ' + config.color + (isSelected ? ' ring-2 ring-beacon-red ring-offset-2 ring-offset-gray-900' : '')} />
        </div>
      </div>
    </button>
  )
}