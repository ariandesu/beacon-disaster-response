import { useState, useEffect, useCallback } from 'react'
import { databases, appwriteClient, APPWRITE_CONFIG } from '../lib/appwrite'
import { getEventsQueries } from '../lib/queries'
import type { Event, EventType } from '../types/database'

const EVENT_ICONS: Record<EventType, React.ReactNode> = {
  created: <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>,
  claimed: <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  resolved: <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
  updated: <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
  assigned: <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  unassigned: <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
}

const EVENT_LABELS: Record<EventType, string> = {
  created: 'Created',
  claimed: 'Claimed',
  resolved: 'Resolved',
  updated: 'Updated',
  assigned: 'Assigned',
  unassigned: 'Unassigned',
}

interface EventTimelineProps {
  beaconId?: string
  limit?: number
}

export default function EventTimeline({ beaconId, limit = 50 }: EventTimelineProps) {
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    if (!databases || !APPWRITE_CONFIG.isConfigured) {
      setError('Appwrite not configured')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const queries = getEventsQueries({ beaconId, limit })
      const response = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.tables.events,
        queries
      )
      setEvents(response.documents as unknown as Event[])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch events'
      setError(message)
      setEvents([])
    } finally {
      setIsLoading(false)
    }
  }, [beaconId, limit])

  useEffect(() => {
    fetchEvents()

    // Subscribe to realtime updates for events
    if (appwriteClient && APPWRITE_CONFIG.isConfigured) {
      const channel = `databases.${APPWRITE_CONFIG.databaseId}.collections.${APPWRITE_CONFIG.tables.events}.documents`
      const unsubscribe = appwriteClient.subscribe([channel], (response) => {
        const event = response.events[0]
        if (event.startsWith('databases.*.collections.*.documents.')) {
          fetchEvents()
        }
      })
      return () => unsubscribe()
    }
  }, [fetchEvents])

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-800/50 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400">
        Failed to load events: {error}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <svg className="w-12 h-12 mx-auto mb-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p>No events recorded yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-4" role="log" aria-live="polite" aria-label="Event timeline">
      {events.map((event, index) => (
        <div
          key={event.$id}
          className="flex gap-4 pb-4 last:pb-0 border-b border-gray-700/50 last:border-0"
        >
          <div className="flex-shrink-0 w-10 flex flex-col items-center">
            <div className={`w-2 h-2 rounded-full ${event.type === 'created' ? 'bg-blue-400' : event.type === 'claimed' ? 'bg-amber-400' : event.type === 'resolved' ? 'bg-green-400' : 'bg-gray-400'}`} />
            {index < events.length - 1 && <div className="w-0.5 h-full bg-gray-700 mt-1" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {EVENT_ICONS[event.type]}
              <span className="font-medium text-white capitalize">{EVENT_LABELS[event.type]}</span>
              <span className="text-xs text-gray-500">{event.beaconId}</span>
            </div>
            <p className="text-gray-300 mt-1 ml-7">{event.message}</p>
            <div className="flex items-center gap-4 mt-1 ml-7 text-xs text-gray-500">
              <span>By: {event.actorId}</span>
              <span>{formatDate(event.createdAt)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}